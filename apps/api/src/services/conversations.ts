import {
  and,
  asc,
  conversation,
  conversationMessage,
  db,
  desc,
  eq,
  ilike,
  or,
  querySql,
} from "@animus/db";
import type { UIMessage } from "ai";

export function serializeConversation(row: typeof conversation.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    titleStatus: row.titleStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
  };
}

export function textOf(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
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
}: {
  userId: string;
  query?: string;
}) {
  const search = query?.trim() ? `%${query.trim()}%` : null;
  const rows = await db.query.conversation.findMany({
    where: search
      ? and(
          eq(conversation.userId, userId),
          or(
            ilike(conversation.title, search),
            querySql`exists (
              select 1
              from conversation_message
              where conversation_message.conversation_id = ${conversation.id}
                and conversation_message.text_content ilike ${search}
            )`
          )
        )
      : eq(conversation.userId, userId),
    orderBy: [desc(conversation.updatedAt)],
    limit: 100,
  });

  return rows.map(serializeConversation);
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

export async function deleteConversation({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}) {
  const deleted = await db
    .delete(conversation)
    .where(
      and(eq(conversation.id, conversationId), eq(conversation.userId, userId))
    )
    .returning({ id: conversation.id });

  return Boolean(deleted[0]);
}
