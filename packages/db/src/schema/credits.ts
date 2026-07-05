/** Credit accounting: each user has one balance row (seeded with the free grant
 * via the column default) and an append-only ledger of per-turn usage. Both hang
 * off the auth `user` row. The ledger's per-request turn id is unique so
 * settling the same streamed turn twice is a no-op (idempotent debit). */

import { bigint, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

/** The free grant a new balance starts with, in micro-USD ($5). Mirrors
 * `FREE_GRANT_MICROS` in `@animus/core` — change both together. */
const FREE_GRANT_MICROS = 5_000_000;

export const userCredits = pgTable("user_credits", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  /** Remaining balance in micro-USD. Seeded to the free grant; may go slightly
   * negative when a metered turn overshoots (balance-only enforcement). */
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
  /** The conversation the turn belonged to. Plain text (not a foreign key) so
   * the cost record survives the conversation being deleted. */
  conversationId: text("conversation_id"),
  /** Unique id of the streamed turn this settles — one per `POST /api/chat`, so
   * re-settling the same request cannot double-charge. NOT the assistant message
   * id: a single message can span multiple requests during a human-in-the-loop
   * tool exchange, so cost must be keyed per request. (The column is named
   * `message_id` for historical reasons; the value is a per-request turn id.) */
  turnId: text("message_id").notNull().unique(),
  /** The metered LLM model, or null when the LLM ran on the user's own key. */
  model: text("model"),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  ttsChars: integer("tts_chars").notNull().default(0),
  /** Total settled cost of the turn in micro-USD. */
  costMicros: bigint("cost_micros", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
