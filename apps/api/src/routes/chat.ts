/** The streaming chat endpoint. Each request runs one turn of the agent's
 * tool-loop and streams the result back as a UI-message stream the web's
 * useChat consumes. The database is authoritative: the client sends only the
 * newest changed UI message, and the stream snapshot is persisted when the
 * turn finishes — including aborted and errored turns, so a stopped stream
 * never loses the user's message or an already-rendered video.
 *
 * Cost control: a turn is metered per-component — the LLM unless the user
 * brought their own key, and TTS unless they brought an ElevenLabs key. A
 * metered turn is refused up front at a non-positive balance (402), usage is
 * accumulated per step as the loop runs, and the turn settles on finish,
 * abort, or error alike. */

import { randomUUID } from "node:crypto";
import { createManimAgent, ensureSandbox } from "@animus/agent";
import { GENERATION_DEFAULTS, OUT_OF_CREDITS } from "@animus/core";
import { getServerEnv } from "@animus/core/env";
import { consumeStream, convertToModelMessages, createIdGenerator } from "ai";
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

/** Concurrent-turn cap per user: each turn binds a sandbox and burns metered
 * spend, and the balance gate only checks at turn START — without a cap, a
 * near-zero balance could fan out arbitrarily many parallel turns across
 * conversations. In-memory is sufficient while prod runs a single container;
 * revisit with a DB-backed lock if the API ever scales out. */
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

/** Request envelope: the conversation id plus the newest UI message. The
 * message's internal shape is checked separately by isUIMessage — here Zod
 * guarantees the envelope itself, so malformed bodies are a clean 400 instead
 * of leaking a non-string id into queries (500). */
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
    // Resolve the effective keys for this turn. A component is metered only
    // when it runs on our key (the user has not brought their own).
    const env = getServerEnv();
    const llmKey = await getDecryptedLlmKey(uid);
    const ttsKey = await getDecryptedTtsKey(uid);
    const isLlmMetered = !llmKey;
    const isTtsMetered = !ttsKey;
    const metered = isLlmMetered || isTtsMetered;
    const elevenLabsApiKey = ttsKey ?? env.elevenLabsApiKey;

    // The user's generation settings shape this turn's narration voice and
    // music bed; a user who never saved any gets the domain defaults.
    const settings = (await getGenerationSettings(uid)) ?? GENERATION_DEFAULTS;

    const messages = mergeIncomingMessage(found.messages, body.message);

    // Pre-flight gate: a metered turn needs a positive balance to start. The
    // running turn is never killed, so the balance may end slightly negative.
    if (metered) {
      const { balanceMicros } = await getOrCreateCredits(uid);
      if (balanceMicros <= 0) {
        // Persist the refused message: the client only ever sends the newest
        // one, so without this save it would silently vanish from the thread
        // once the user tops up and sends the next message.
        await saveConversationMessages({ conversationId, messages });
        releaseTurn();
        // Name the key that actually unblocks them — a user who already
        // brought an LLM key is metered only for narration, and vice versa.
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

    // Create-or-resume this conversation's sandbox and bind the Manim tools to
    // it. First creation bootstraps the toolchain and can take a few minutes.
    const sandbox = await ensureSandbox({
      conversationId,
      sandboxId: found.conversation.sandboxId,
      elevenLabsApiKey,
    });
    if (sandbox.id !== found.conversation.sandboxId) {
      await setConversationSandboxId(conversationId, sandbox.id);
    }

    // Accumulates narration characters synthesized this turn, for TTS metering.
    const meter = { ttsChars: 0 };

    // LLM usage accumulated per completed step. `totalUsage` reports nothing
    // for an aborted stream — and the most expensive turns (long renders cut
    // by the platform's duration cap, the user pressing Stop) are exactly the
    // aborted ones, so metering must not depend on a clean finish. inputTokens
    // is the total (including cached); the cache-read/write subsets are tracked
    // separately so they're priced at the cache rates, not the full input rate.
    const usageTotals = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };

    // Idempotency key for settling this turn's cost. Must be unique PER
    // REQUEST, not per assistant message: a single assistant message spans
    // multiple requests during a human-in-the-loop tool exchange (the user
    // answers, the same message continues), so keying on the message id would
    // dedupe — and never charge — every continuation after the first.
    const turnId = randomUUID();

    // Settle exactly once per turn, whichever path ends it (finish, abort, or
    // error). settleUsage is also idempotent on turnId server-side.
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
      prompt: await convertToModelMessages(messages),
    });

    // Heartbeats wrap the response so a long tool call (renderScene runs for
    // up to 600s in silence) can't be read as a dead connection by a proxy
    // between here and the browser.
    return withSseHeartbeat(
      result.toUIMessageStreamResponse({
        generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
        originalMessages: messages,
        // Keep consuming the stream server-side so a client disconnect (closed
        // tab, dropped network) doesn't halt persistence and settlement mid-turn.
        // Also the turn's backstop: when the SSE stream ends — however it ends —
        // settle and release the slot even if onFinish never fired.
        consumeSseStream: ({ stream }) => {
          consumeStream({ stream }).finally(() => {
            settleTurn().finally(releaseTurn);
          });
        },
        // Surfaced to the client as the error part's text; the raw error stays
        // in the logs. Settlement still runs — steps completed before the error
        // were real spend.
        onError: (error) => {
          logger.error(
            { conversationId, turnId, error: describeError(error) },
            "chat stream errored mid-turn"
          );
          settleTurn().catch(() => {
            // settleTurn logs its own failures.
          });
          return "Something went wrong while generating. Try sending your message again.";
        },
        onFinish: async ({ messages: completedMessages, isAborted }) => {
          try {
            // Persist whatever the turn produced — a stopped or cut turn keeps
            // the user's message and any partial assistant work (including a
            // rendered video's key, which would otherwise orphan in R2).
            await saveConversationMessages({
              conversationId,
              messages: completedMessages,
            });
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
      })
    );
  } catch (error) {
    // The turn never produced a stream; without this the slot would leak.
    releaseTurn();
    throw error;
  }
});
