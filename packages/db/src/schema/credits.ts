/** One balance row per user, seeded by the column default, plus an append-only
 * usage ledger. The ledger's turn id is unique, which is what makes settling
 * the same turn twice a no-op. */

import { bigint, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

/** Mirrors `FREE_GRANT_MICROS` in `@animus/core`; change both together. */
const FREE_GRANT_MICROS = 5_000_000;

export const userCredits = pgTable("user_credits", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  /** May go slightly negative: a running turn is never killed. */
  balanceMicros: bigint("balance_micros", { mode: "number" })
    .notNull()
    .default(FREE_GRANT_MICROS),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const usageEvent = pgTable("usage_event", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  /** Plain text, not a key, so cost history survives the conversation. */
  conversationId: text("conversation_id"),
  /** One per `POST /api/chat`, not per assistant message: a message spans
   * several requests across a HITL exchange. The column keeps the historical
   * `message_id` name but holds a per-request turn id. */
  turnId: text("message_id").notNull().unique(),
  /** Null when the LLM ran on the user's own key. */
  model: text("model"),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  ttsChars: integer("tts_chars").notNull().default(0),
  costMicros: bigint("cost_micros", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
