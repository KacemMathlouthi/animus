/** One turn of the agent's tool-loop, streamed to the web's useChat. The DB is
 * authoritative: the client sends only the newest message, and the snapshot is
 * persisted per step so a turn dying mid-flight does not revert the thread. */

import { randomUUID } from "node:crypto";
import {
  createManimAgent,
  ensureSandbox,
  isSandboxProvisioningError,
} from "@animus/agent";
import {
  GENERATION_DEFAULTS,
  OUT_OF_CREDITS,
  SANDBOX_UNAVAILABLE,
} from "@animus/core";
import { getServerEnv } from "@animus/core/env";
import {
  consumeStream,
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { logger } from "../lib/logger.ts";
import { backgroundMusicUrl, saveVideo } from "../lib/media.ts";
import { withSseHeartbeat } from "../lib/sse-heartbeat.ts";
import { userId } from "../lib/user.ts";
import { requireAuth } from "../middleware/auth.ts";
import { aiTelemetry } from "../observability/telemetry.ts";
import { maybeGenerateConversationTitle } from "../services/conversation-titles.ts";
import {
  isUIMessage,
  loadOwnedConversation,
  mergeIncomingMessage,
  saveConversationMessages,
  setConversationSandboxId,
} from "../services/conversations.ts";
import { getOrCreateCredits, settleUsage } from "../services/credits.ts";
import {
  getDecryptedLlmKey,
  getDecryptedTtsKey,
  getGenerationSettings,
} from "../services/settings.ts";
import type { AppEnv } from "../types.ts";

export const chatRoute = new Hono<AppEnv>();

chatRoute.use("*", requireAuth);

/** The balance gate only checks at turn START, so without a cap a near-zero
 * balance could fan out arbitrarily many parallel turns. In-memory is enough
 * while prod is one container; needs a DB lock if the API scales out. */
const MAX_TURNS_PER_USER = 2;
const inFlightTurns = new Map<string, number>();

function acquireTurnSlot(uid: string): (() => void) | null {
  const inFlight = inFlightTurns.get(uid) ?? 0;
  if (inFlight >= MAX_TURNS_PER_USER) {
    return null;
  }
  inFlightTurns.set(uid, inFlight + 1);
  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    const current = inFlightTurns.get(uid) ?? 1;
    if (current <= 1) {
      inFlightTurns.delete(uid);
    } else {
      inFlightTurns.set(uid, current - 1);
    }
  };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The message's own shape is checked by isUIMessage; Zod guarantees the
 * envelope, so a malformed body is a clean 400 rather than a non-string id
 * reaching a query as a 500. */
const ChatRequestSchema = z.object({
  id: z.string().min(1),
  message: z.unknown(),
});

chatRoute.post("/", async (c) => {
  const parsed = ChatRequestSchema.safeParse(
    await c.req.json().catch(() => null)
  );

  if (!(parsed.success && isUIMessage(parsed.data.message))) {
    throw new HTTPException(400, { message: "id and message are required" });
  }
  const body = { id: parsed.data.id, message: parsed.data.message };
  const conversationId = body.id;
  const uid = userId(c);

  const found = await loadOwnedConversation({ conversationId, userId: uid });

  if (!found) {
    throw new HTTPException(404, { message: "Conversation not found" });
  }

  const releaseTurn = acquireTurnSlot(uid);
  if (!releaseTurn) {
    throw new HTTPException(429, {
      message:
        "You already have videos generating. Wait for one to finish before starting another.",
    });
  }

  try {
    // A component is metered only when it runs on our key.
    const env = getServerEnv();
    const llmKey = await getDecryptedLlmKey(uid);
    const ttsKey = await getDecryptedTtsKey(uid);
    const isLlmMetered = !llmKey;
    const isTtsMetered = !ttsKey;
    const metered = isLlmMetered || isTtsMetered;
    const elevenLabsApiKey = ttsKey ?? env.elevenLabsApiKey;

    const settings = (await getGenerationSettings(uid)) ?? GENERATION_DEFAULTS;

    const messages = mergeIncomingMessage(found.messages, body.message);

    // Balance-only: a running turn is never killed, so it may end negative.
    if (metered) {
      const { balanceMicros } = await getOrCreateCredits(uid);
      if (balanceMicros <= 0) {
        // The client only sends the newest message, so an unsaved refusal
        // vanishes from the thread once the user tops up.
        await saveConversationMessages({ conversationId, messages });
        releaseTurn();
        // Name the key that actually unblocks them.
        let missingKeys = "model and ElevenLabs keys";
        if (!isTtsMetered) {
          missingKeys = "model key";
        } else if (!isLlmMetered) {
          missingKeys = "ElevenLabs narration key";
        }
        return c.json(
          {
            code: OUT_OF_CREDITS,
            message: `You're out of credits. Add your own ${missingKeys} in settings to keep going.`,
          },
          402
        );
      }
    }

    // First creation bootstraps the toolchain and can take a few minutes.
    const sandbox = await ensureSandbox({
      conversationId,
      sandboxId: found.conversation.sandboxId,
      elevenLabsApiKey,
    }).catch((error: unknown) => {
      // Quota, rate limit or an unreachable host: not the user's fault and not
      // a broken turn, so say so instead of a bare 500 the UI cannot read.
      if (isSandboxProvisioningError(error)) {
        logger.error(
          { conversationId, error: describeError(error) },
          "could not provision a sandbox"
        );
        throw new HTTPException(503, {
          res: c.json(
            {
              code: SANDBOX_UNAVAILABLE,
              message:
                "The render environment is at capacity right now. Try again in a few minutes.",
            },
            503
          ),
        });
      }
      throw error;
    });
    if (sandbox.id !== found.conversation.sandboxId) {
      await setConversationSandboxId(conversationId, sandbox.id);
    }

    const meter = { ttsChars: 0 };

    // Per step, not `totalUsage`: that reports nothing for an aborted stream,
    // and aborted turns (cut renders, Stop) are the expensive ones. Cache
    // subsets are tracked apart so they price at cache rates.
    const usageTotals = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };

    // Unique per REQUEST, not per assistant message: one message spans several
    // requests across a HITL exchange, so a message-id key would never charge
    // any continuation after the first.
    const turnId = randomUUID();

    // Once per turn whichever path ends it; settleUsage is idempotent too.
    let settled = false;
    const settleTurn = async () => {
      if (settled) {
        return;
      }
      settled = true;
      try {
        await settleUsage({
          userId: uid,
          conversationId,
          turnId,
          isLlmMetered,
          model: env.bedrockModel,
          inputTokens: usageTotals.inputTokens,
          outputTokens: usageTotals.outputTokens,
          cacheReadTokens: usageTotals.cacheReadTokens,
          cacheWriteTokens: usageTotals.cacheWriteTokens,
          isTtsMetered,
          ttsChars: meter.ttsChars,
        });
      } catch (error) {
        logger.error(
          { conversationId, turnId, error: describeError(error) },
          "failed to settle turn usage"
        );
      }
    };

    const agent = createManimAgent({
      sandbox,
      conversationId,
      saveVideo,
      backgroundMusicUrl,
      elevenLabsApiKey,
      voiceId: settings.voiceId,
      backgroundMusic: settings.backgroundMusic,
      musicTrackId: settings.musicTrack,
      meter,
      llmKey,
      onStepFinish: (step) => {
        usageTotals.inputTokens += step.usage.inputTokens ?? 0;
        usageTotals.outputTokens += step.usage.outputTokens ?? 0;
        usageTotals.cacheReadTokens +=
          step.usage.inputTokenDetails?.cacheReadTokens ?? 0;
        usageTotals.cacheWriteTokens +=
          step.usage.inputTokenDetails?.cacheWriteTokens ?? 0;
      },
      telemetry: aiTelemetry({
        functionId: "manim-agent",
        metadata: {
          conversationId,
          userId: uid,
          model: llmKey ? llmKey.model : env.bedrockModel,
        },
      }),
    });
    const result = await agent.stream({
      abortSignal: c.req.raw.signal,
      // A turn cut mid-tool leaves a call with no result, and a tool_use with
      // no tool_result is a hard provider error that would reject every later
      // message. Dropping it lets the agent pick the step up again.
      prompt: await convertToModelMessages(messages, {
        ignoreIncompleteToolCalls: true,
      }),
    });

    // Per step, not just on finish: a thrown tool, the host's request cap or a
    // dropped sandbox all end a turn in ways onFinish never sees. Serialized
    // because saveConversationMessages deletes and re-inserts every row.
    let persisting: Promise<void> = Promise.resolve();
    const persist = (snapshot: UIMessage[]): Promise<void> => {
      persisting = persisting
        .then(() =>
          saveConversationMessages({ conversationId, messages: snapshot })
        )
        .then(() => undefined)
        .catch((error: unknown) => {
          // Self-heals: the next step rewrites the whole history.
          logger.error(
            { conversationId, turnId, error: describeError(error) },
            "failed to persist a turn snapshot"
          );
        });
      return persisting;
    };

    const stream = createUIMessageStream({
      execute: ({ writer }) => {
        writer.merge(result.toUIMessageStream());
      },
      generateId: createIdGenerator({ prefix: "msg", size: 16 }),
      onError: (error) => {
        logger.error(
          { conversationId, turnId, error: describeError(error) },
          "chat stream errored mid-turn"
        );
        // Steps completed before the error were real spend.
        settleTurn().catch(() => {
          // settleTurn logs its own failures.
        });
        return "Something went wrong while generating. Try sending your message again.";
      },
      onFinish: async ({ messages: completedMessages, isAborted }) => {
        try {
          await persist(completedMessages);
          if (!isAborted) {
            maybeGenerateConversationTitle({
              conversationId,
              messages: completedMessages,
            });
          }
        } finally {
          await settleTurn();
          releaseTurn();
        }
      },
      onStepFinish: ({ messages: snapshot }) => persist(snapshot),
      originalMessages: messages,
    });

    // Keeps a silent 600s renderScene from reading as a dead connection.
    return withSseHeartbeat(
      createUIMessageStreamResponse({
        // Keep consuming so a client disconnect does not halt the turn.
        consumeSseStream: ({ stream: sse }) => {
          consumeStream({ stream: sse }).finally(() => {
            settleTurn().finally(releaseTurn);
          });
        },
        stream,
      })
    );
  } catch (error) {
    // No stream was produced, so the slot would otherwise leak.
    releaseTurn();
    throw error;
  }
});
