import {
  and,
  asc,
  conversation,
  conversationMessage,
  db,
  desc,
  eq,
  exists,
  ilike,
  or,
} from "@animus/db";
import type { UIMessage } from "ai";

const DEFAULT_CONVERSATION_LIMIT = 30;
const MAX_CONVERSATION_LIMIT = 100;

type ConversationRow = typeof conversation.$inferSelect;

export function serializeConversation(row: ConversationRow) {
  return {
    id: row.id,
    title: row.title,
    titleStatus: row.titleStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
  };
}

/** The plain visible text of a message — its text parts joined. Used both for
 * the persisted `text_content` search column and for title generation, so the
 * two always agree on what "the message said". */
export function textOf(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function listLimit(limit?: number) {
  if (!limit) {
    return DEFAULT_CONVERSATION_LIMIT;
  }
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_CONVERSATION_LIMIT);
}

function listOffset(offset?: number) {
  if (!offset || offset < 0) {
    return 0;
  }
  return Math.trunc(offset);
}

const LIKE_WILDCARD = /[\\%_]/g;
const WHITESPACE = /\s+/;

/** Escape LIKE wildcards so a literal `%` or `_` in the query is matched
 * verbatim (Postgres ILIKE treats backslash as the escape character). */
function likePattern(token: string) {
  return `%${token.replace(LIKE_WILDCARD, "\\$&")}%`;
}

/** Match the search query against the conversation title or any of its messages'
 * persisted text, pushed into SQL so Postgres uses the `text_content` index
 * instead of us scanning rows in memory.
 *
 * Each whitespace-separated term is matched independently (all must hit, in the
 * title or some message). Per-term matching — rather than one contiguous
 * substring — keeps search resilient to the markdown markers and punctuation in
 * the stored text: "mechanics of learning" still matches text persisted as
 * "the *mechanics* of learning". */
function searchFilter(query?: string) {
  const tokens = (query ?? "").trim().split(WHITESPACE).filter(Boolean);
  if (tokens.length === 0) {
    return;
  }

  return and(
    ...tokens.map((token) => {
      const pattern = likePattern(token);
      return or(
        ilike(conversation.title, pattern),
        exists(
          db
            .select()
            .from(conversationMessage)
            .where(
              and(
                eq(conversationMessage.conversationId, conversation.id),
                ilike(conversationMessage.textContent, pattern)
              )
            )
        )
      );
    })
  );
}

export function isUIMessage(value: unknown): value is UIMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "role" in value &&
    typeof value.role === "string" &&
    "parts" in value &&
    Array.isArray(value.parts)
  );
}

export function mergeIncomingMessage(
  messages: UIMessage[],
  message: UIMessage
) {
  const index = messages.findIndex((item) => item.id === message.id);
  if (index === -1) {
    return [...messages, message];
  }

  const next = [...messages];
  next[index] = message;
  return next;
}

export async function createConversation(userId: string) {
  const now = new Date();
  const row = {
    id: crypto.randomUUID(),
    userId,
    title: "Untitled video",
    titleStatus: "pending",
    createdAt: now,
    updatedAt: now,
    lastMessageAt: null,
  } satisfies typeof conversation.$inferInsert;

  await db.insert(conversation).values(row);

  return serializeConversation(row as typeof conversation.$inferSelect);
}

export async function listConversations({
  userId,
  query,
  limit,
  offset,
}: {
  userId: string;
  query?: string;
  limit?: number;
  offset?: number;
}) {
  const where = and(eq(conversation.userId, userId), searchFilter(query));
  const [rows, total] = await Promise.all([
    db.query.conversation.findMany({
      where,
      orderBy: [desc(conversation.updatedAt)],
      limit: listLimit(limit),
      offset: listOffset(offset),
    }),
    db.$count(conversation, where),
  ]);

  return { conversations: rows.map(serializeConversation), total };
}

/** Cheap ownership check — no message load — for gating per-object access. */
export async function userOwnsConversation({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}): Promise<boolean> {
  const row = await db.query.conversation.findFirst({
    columns: { id: true },
    where: and(
      eq(conversation.id, conversationId),
      eq(conversation.userId, userId)
    ),
  });
  return Boolean(row);
}

export async function loadOwnedConversation({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}) {
  const row = await db.query.conversation.findFirst({
    where: and(
      eq(conversation.id, conversationId),
      eq(conversation.userId, userId)
    ),
    with: {
      messages: {
        orderBy: [asc(conversationMessage.position)],
      },
    },
  });

  if (!row) {
    return null;
  }

  return {
    conversation: row,
    messages: row.messages.map((message) => message.uiMessage as UIMessage),
  };
}

export async function saveConversationMessages({
  conversationId,
  messages,
}: {
  conversationId: string;
  messages: UIMessage[];
}) {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .delete(conversationMessage)
      .where(eq(conversationMessage.conversationId, conversationId));

    if (messages.length > 0) {
      await tx.insert(conversationMessage).values(
        messages.map((message, index) => ({
          conversationId,
          messageId: message.id,
          position: index,
          role: message.role,
          textContent: textOf(message),
          uiMessage: message,
        }))
      );
    }

    await tx
      .update(conversation)
      .set({ lastMessageAt: now, updatedAt: now })
      .where(eq(conversation.id, conversationId));
  });
}

export async function renameConversation({
  conversationId,
  userId,
  title,
}: {
  conversationId: string;
  userId: string;
  title: string;
}) {
  const updated = await db
    .update(conversation)
    .set({
      title,
      titleStatus: "manual",
      updatedAt: new Date(),
    })
    .where(
      and(eq(conversation.id, conversationId), eq(conversation.userId, userId))
    )
    .returning();

  return updated[0] ? serializeConversation(updated[0]) : null;
}

export async function setConversationSandboxId(
  conversationId: string,
  sandboxId: string
): Promise<void> {
  await db
    .update(conversation)
    .set({ sandboxId })
    .where(eq(conversation.id, conversationId));
}

/** Deletes the conversation (messages cascade) and returns its sandbox id so the
 * caller can tear the sandbox down. Null when no row was deleted. */
export async function deleteConversation({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}): Promise<{ sandboxId: string | null } | null> {
  const deleted = await db
    .delete(conversation)
    .where(
      and(eq(conversation.id, conversationId), eq(conversation.userId, userId))
    )
    .returning({ sandboxId: conversation.sandboxId });

  return deleted[0] ?? null;
}
