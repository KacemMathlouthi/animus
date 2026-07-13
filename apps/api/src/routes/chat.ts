/** The streaming chat endpoint. Each request runs one turn of the agent's
 * tool-loop and streams the result back as a UI-message stream the web's
 * useChat consumes. The database is authoritative: the client sends only the
 * newest changed UI message, and the completed stream snapshot is persisted
 * once the turn finishes.
 *
 * Cost control: a turn is metered per-component — the LLM unless the user
 * brought their own key, and TTS unless they brought an ElevenLabs key. A
 * metered turn is refused up front at a non-positive balance (402), and the
 * turn's real cost is settled against the balance on finish. */

import { randomUUID } from "node:crypto";
import { createManimAgent, ensureSandbox } from "@animus/agent";
import { OUT_OF_CREDITS } from "@animus/core";
import { getServerEnv } from "@animus/core/env";
import { convertToModelMessages, createIdGenerator } from "ai";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { backgroundMusicUrl, saveVideo } from "../lib/media.ts";
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
} from "../services/settings.ts";
import type { AppEnv } from "../types.ts";

export const chatRoute = new Hono<AppEnv>();

chatRoute.use("*", requireAuth);

chatRoute.post("/", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    id?: string;
    message?: unknown;
  } | null;

  if (!(body?.id && isUIMessage(body.message))) {
    throw new HTTPException(400, { message: "id and message are required" });
  }
  const conversationId = body.id;
  const uid = userId(c);

  const found = await loadOwnedConversation({ conversationId, userId: uid });

  if (!found) {
    throw new HTTPException(404, { message: "Conversation not found" });
  }

  // Resolve the effective keys for this turn. A component is metered only when
  // it runs on our key (the user has not brought their own).
  const env = getServerEnv();
  const llmKey = await getDecryptedLlmKey(uid);
  const ttsKey = await getDecryptedTtsKey(uid);
  const isLlmMetered = !llmKey;
  const isTtsMetered = !ttsKey;
  const metered = isLlmMetered || isTtsMetered;
  const elevenLabsApiKey = ttsKey ?? env.elevenLabsApiKey;

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
      // Name the key that actually unblocks them — a user who already brought
      // an LLM key is metered only for narration, and vice versa.
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

  // Create-or-resume this conversation's sandbox and bind the Manim tools to it.
  // First creation bootstraps the toolchain and can take a few minutes.
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

  // Idempotency key for settling this turn's cost. Must be unique PER REQUEST,
  // not per assistant message: a single assistant message spans multiple
  // requests during a human-in-the-loop tool exchange (the user answers, the
  // same message continues), so keying on the message id would dedupe — and
  // never charge — every continuation after the first.
  const turnId = randomUUID();

  const agent = createManimAgent({
    sandbox,
    conversationId,
    saveVideo,
    backgroundMusicUrl,
    elevenLabsApiKey,
    meter,
    llmKey,
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

  return result.toUIMessageStreamResponse({
    generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
    originalMessages: messages,
    onFinish: async ({ messages: completedMessages }) => {
      await saveConversationMessages({
        conversationId,
        messages: completedMessages,
      });
      maybeGenerateConversationTitle({
        conversationId,
        messages: completedMessages,
      });

      // Settle this turn's metered cost against the balance, keyed by the
      // per-request turn id (idempotent if this same request settles twice).
      const usage = await result.totalUsage;
      await settleUsage({
        userId: uid,
        conversationId,
        turnId,
        isLlmMetered,
        model: env.bedrockModel,
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        isTtsMetered,
        ttsChars: meter.ttsChars,
      });
    },
  });
});
