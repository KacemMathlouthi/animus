/** Per-user settings: generation defaults and bring-your-own provider keys. Both
 * hang off the auth `user` row and cascade-delete with it. A user may hold at
 * most one LLM key and one TTS key — one `provider_key` row per `kind`. Provider
 * keys are stored encrypted — the API never writes plaintext here. */

import {
  boolean,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  videoTheme: text("video_theme").default("dark").notNull(),
  backgroundMusic: boolean("background_music").default(true).notNull(),
  /** Defaults mirror `DEFAULT_MUSIC_TRACK_ID` / `DEFAULT_VOICE_ID` in
   * `@animus/core` generation — change both together. */
  musicTrack: text("music_track").default("ambient").notNull(),
  voiceId: text("voice_id").default("Xb7hH8MSUJpSbSDYk0k2").notNull(),
  font: text("font").default("geist").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const providerKey = pgTable(
  "provider_key",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Which key this is: "llm" (Anthropic/OpenAI/Google) or "tts" (ElevenLabs).
     * Part of the primary key, so a user can hold one of each. */
    kind: text("kind").notNull().default("llm"),
    /** Provider id: an LLM provider ("anthropic", …) or "elevenlabs" for TTS. */
    provider: text("provider").notNull(),
    /** Curated model id for an LLM key; null for a TTS key. */
    model: text("model"),
    /** AES-256-GCM ciphertext as `iv.tag.ciphertext` (all base64). */
    keyEncrypted: text("key_encrypted").notNull(),
    /** Last 4 chars of the plaintext key — safe to show as a masked preview. */
    keyLast4: text("key_last4").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.kind] })]
);
