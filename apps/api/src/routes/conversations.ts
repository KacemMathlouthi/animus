import { destroySandbox } from "@animus/agent";
import {
  ConversationListResponseSchema,
  CreateConversationResponseSchema,
  RenameConversationInputSchema,
} from "@animus/core";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../lib/logger.ts";
import { deleteConversationMedia } from "../lib/media.ts";
import { userId } from "../lib/user.ts";
import { requireAuth } from "../middleware/auth.ts";
import {
  createConversation,
  deleteConversation,
  listConversations,
  loadOwnedConversation,
  renameConversation,
  serializeConversation,
} from "../services/conversations.ts";
import type { AppEnv } from "../types.ts";

export const conversationsRoute = new Hono<AppEnv>();

conversationsRoute.use("*", requireAuth);

conversationsRoute.post("/", async (c) => {
  const conversation = await createConversation(userId(c));
  const response = CreateConversationResponseSchema.parse({ conversation });
  return c.json(response);
});

conversationsRoute.get("/", async (c) => {
  const limit = Number(c.req.query("limit"));
  const offset = Number(c.req.query("offset"));
  const response = await listConversations({
    userId: userId(c),
    query: c.req.query("q"),
    limit: Number.isFinite(limit) ? limit : undefined,
    offset: Number.isFinite(offset) ? offset : undefined,
  });
  return c.json(ConversationListResponseSchema.parse(response));
});

conversationsRoute.get("/:id", async (c) => {
  const found = await loadOwnedConversation({
    conversationId: c.req.param("id"),
    userId: userId(c),
  });

  if (!found) {
    throw new HTTPException(404, { message: "Conversation not found" });
  }

  return c.json({
    conversation: serializeConversation(found.conversation),
    messages: found.messages,
  });
});

conversationsRoute.patch("/:id", async (c) => {
  const parsed = RenameConversationInputSchema.safeParse(
    await c.req.json().catch(() => null)
  );
  if (!parsed.success) {
    throw new HTTPException(400, { message: "Invalid conversation title" });
  }

  const conversation = await renameConversation({
    conversationId: c.req.param("id"),
    userId: userId(c),
    title: parsed.data.title,
  });

  if (!conversation) {
    throw new HTTPException(404, { message: "Conversation not found" });
  }

  return c.json({ conversation });
});

conversationsRoute.delete("/:id", async (c) => {
  const deleted = await deleteConversation({
    conversationId: c.req.param("id"),
    userId: userId(c),
  });

  if (!deleted) {
    throw new HTTPException(404, { message: "Conversation not found" });
  }

  // TODO: temporary design. Tear the sandbox down out-of-band — the delete
  // shouldn't block on (or fail because of) the provider.
  if (deleted.sandboxId) {
    const sandboxId = deleted.sandboxId;
    destroySandbox(sandboxId).catch((error) =>
      logger.warn({ err: error, sandboxId }, "sandbox destroy failed")
    );
  }

  // Drop the conversation's rendered videos from R2, out-of-band for the same
  // reason — the delete shouldn't fail because object storage is unavailable.
  const conversationId = c.req.param("id");
  deleteConversationMedia(conversationId).catch((error) =>
    logger.warn({ err: error, conversationId }, "media cleanup failed")
  );

  return c.json({ ok: true });
});
