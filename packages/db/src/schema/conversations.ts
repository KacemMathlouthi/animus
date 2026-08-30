import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

export const conversation = pgTable(
  "conversation",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").default("Untitled video").notNull(),
    titleStatus: text("title_status").default("pending").notNull(),
    /** Sandbox id backing this conversation's workspace, set lazily. Null until then. */
    sandboxId: text("sandbox_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    lastMessageAt: timestamp("last_message_at"),
  },
  (table) => [
    index("conversation_user_last_message_idx").on(
      table.userId,
      table.lastMessageAt
    ),
    index("conversation_user_updated_idx").on(table.userId, table.updatedAt),
  ]
);

export const conversationMessage = pgTable(
  "conversation_message",
  {
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    messageId: text("message_id").notNull(),
    position: integer("position").notNull(),
    role: text("role").notNull(),
    textContent: text("text_content").default("").notNull(),
    uiMessage: jsonb("ui_message").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.conversationId, table.messageId],
      name: "conversation_message_pk",
    }),
    index("conversation_message_conversation_position_idx").on(
      table.conversationId,
      table.position
    ),
    index("conversation_message_text_idx").on(table.textContent),
  ]
);

/** A permanent, unlisted public share of a single rendered video. The `token` is
 * the unguessable public slug used in the share URL; anyone with it can view the
 * video (the public route mints a fresh presigned URL on each load). One share
 * per `videoKey` (unique) so re-sharing the same render returns the same link.
 * Cascades with its conversation, so deleting the conversation revokes the link. */
export const videoShare = pgTable(
  "video_share",
  {
    token: text("token").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    videoKey: text("video_key").notNull(),
    /** Title snapshot shown on the public page (the conversation's title at share time). */
    title: text("title").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("video_share_video_key_idx").on(table.videoKey),
    index("video_share_conversation_idx").on(table.conversationId),
  ]
);

export const conversationRelations = relations(
  conversation,
  ({ many, one }) => ({
    user: one(user, {
      fields: [conversation.userId],
      references: [user.id],
    }),
    messages: many(conversationMessage),
  })
);

export const conversationMessageRelations = relations(
  conversationMessage,
  ({ one }) => ({
    conversation: one(conversation, {
      fields: [conversationMessage.conversationId],
      references: [conversation.id],
    }),
  })
);
