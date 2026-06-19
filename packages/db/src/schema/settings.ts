/** Per-user settings: generation defaults and a single bring-your-own provider
 * key. Both hang off the auth `user` row (one settings row + at most one key
 * per user) and cascade-delete with it. The provider key is stored encrypted —
 * the API never writes plaintext here. */

import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  videoTheme: text("video_theme").default("dark").notNull(),
  backgroundMusic: boolean("background_music").default(true).notNull(),
  musicTrack: text("music_track"),
  voiceId: text("voice_id"),
  font: text("font").default("geist").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const providerKey = pgTable("provider_key", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  /** Provider id (e.g. "anthropic", "openai") — see the web providers list. */
  provider: text("provider").notNull(),
  /** AES-256-GCM ciphertext as `iv.tag.ciphertext` (all base64). */
  keyEncrypted: text("key_encrypted").notNull(),
  /** Last 4 chars of the plaintext key — safe to show as a masked preview. */
  keyLast4: text("key_last4").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});
