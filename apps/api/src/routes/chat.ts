/** The streaming chat endpoint. Each request runs one turn of the agent's
 * tool-loop and streams the result back as a UI-message stream the web's
 * useChat consumes. The database is authoritative: the client sends only the
 * newest changed UI message, and the completed stream snapshot is persisted
 * once the turn finishes. */

import { createManimAgent, ensureSandbox } from "@animus/agent";
import { convertToModelMessages, createIdGenerator } from "ai";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { saveVideo } from "../lib/media.ts";
import { userId } from "../lib/user.ts";
import { requireAuth } from "../middleware/auth.ts";
import { maybeGenerateConversationTitle } from "../services/conversation-titles.ts";
import {
  isUIMessage,
  loadOwnedConversation,
  mergeIncomingMessage,
  saveConversationMessages,
  setConversationSandboxId,
} from "../services/conversations.ts";
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

  const found = await loadOwnedConversation({
    conversationId,
    userId: userId(c),
  });

  if (!found) {
    throw new HTTPException(404, { message: "Conversation not found" });
  }

  const messages = mergeIncomingMessage(found.messages, body.message);

  // Create-or-resume this conversation's sandbox and bind the Manim tools to it.
  // First creation bootstraps the toolchain and can take a few minutes.
  const sandbox = await ensureSandbox({
    conversationId,
    sandboxId: found.conversation.sandboxId,
  });
  if (sandbox.id !== found.conversation.sandboxId) {
    await setConversationSandboxId(conversationId, sandbox.id);
  }

  const agent = createManimAgent({ sandbox, conversationId, saveVideo });
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
    },
  });
});
