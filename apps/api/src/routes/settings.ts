/** Per-user settings: generation defaults and a single BYO provider key. All
 * routes require auth and operate only on the caller's own row. Provider keys
 * are encrypted before they touch the database, and only a masked preview
 * (provider + last 4 chars) is ever returned to the client. */

import { db, eq, providerKey, userSettings } from "@animus/db";
import { type Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { encryptSecret } from "../lib/crypto.ts";
import { requireAuth } from "../middleware/auth.ts";
import type { AppEnv } from "../types.ts";

export const settingsRoute = new Hono<AppEnv>();

settingsRoute.use("*", requireAuth);

/** Provider ids the web client offers — keep in sync with the web providers list. */
const PROVIDER_IDS = [
  "openai",
  "anthropic",
  "google",
  "mistral",
  "groq",
  "xai",
] as const;

const GenerationSchema = z.object({
  videoTheme: z.enum(["light", "dark"]),
  backgroundMusic: z.boolean(),
  musicTrack: z.string().min(1),
  voiceId: z.string().min(1),
  font: z.string().min(1),
});

const KeySchema = z.object({
  provider: z.enum(PROVIDER_IDS),
  key: z.string().min(1).max(512),
});

/** The caller's id, guaranteed present by `requireAuth`. */
function userId(c: Context<AppEnv>): string {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  return user.id;
}

settingsRoute.get("/generation", async (c) => {
  const row = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId(c)),
  });
  const settings = row
    ? {
        videoTheme: row.videoTheme,
        backgroundMusic: row.backgroundMusic,
        musicTrack: row.musicTrack,
        voiceId: row.voiceId,
        font: row.font,
      }
    : null;
  return c.json({ settings });
});

settingsRoute.put("/generation", async (c) => {
  const parsed = GenerationSchema.safeParse(
    await c.req.json().catch(() => null)
  );
  if (!parsed.success) {
    throw new HTTPException(400, { message: "Invalid generation settings" });
  }
  const id = userId(c);
  const values = { ...parsed.data, userId: id };
  await db
    .insert(userSettings)
    .values(values)
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { ...parsed.data, updatedAt: new Date() },
    });
  return c.json({ settings: parsed.data });
});

settingsRoute.get("/keys", async (c) => {
  const row = await db.query.providerKey.findFirst({
    where: eq(providerKey.userId, userId(c)),
  });
  const key = row ? { provider: row.provider, last4: row.keyLast4 } : null;
  return c.json({ key });
});

settingsRoute.put("/keys", async (c) => {
  const parsed = KeySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    throw new HTTPException(400, { message: "Invalid provider key" });
  }
  const id = userId(c);
  const trimmed = parsed.data.key.trim();
  const values = {
    userId: id,
    provider: parsed.data.provider,
    keyEncrypted: encryptSecret(trimmed),
    keyLast4: trimmed.slice(-4),
  };
  await db
    .insert(providerKey)
    .values(values)
    .onConflictDoUpdate({
      target: providerKey.userId,
      set: {
        provider: values.provider,
        keyEncrypted: values.keyEncrypted,
        keyLast4: values.keyLast4,
        updatedAt: new Date(),
      },
    });
  return c.json({ key: { provider: values.provider, last4: values.keyLast4 } });
});

settingsRoute.delete("/keys", async (c) => {
  await db.delete(providerKey).where(eq(providerKey.userId, userId(c)));
  return c.json({ ok: true });
});
