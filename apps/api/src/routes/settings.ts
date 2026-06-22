/** Per-user settings: generation defaults and a single BYO provider key. All
 * routes require auth and operate only on the caller's own row. Provider keys
 * are encrypted before they touch the database, and only a masked preview
 * (provider + last 4 chars) is ever returned to the client. */

import { GenerationSettingsSchema, ProviderKeyInputSchema } from "@animus/core";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { userId } from "../lib/user.ts";
import { requireAuth } from "../middleware/auth.ts";
import {
  deleteProviderKey,
  getGenerationSettings,
  getProviderKey,
  saveGenerationSettings,
  saveProviderKey,
} from "../services/settings.ts";
import type { AppEnv } from "../types.ts";

export const settingsRoute = new Hono<AppEnv>();

settingsRoute.use("*", requireAuth);

settingsRoute.get("/generation", async (c) => {
  const settings = await getGenerationSettings(userId(c));
  return c.json({ settings });
});

settingsRoute.put("/generation", async (c) => {
  const parsed = GenerationSettingsSchema.safeParse(
    await c.req.json().catch(() => null)
  );
  if (!parsed.success) {
    throw new HTTPException(400, { message: "Invalid generation settings" });
  }
  const settings = await saveGenerationSettings({
    userId: userId(c),
    settings: parsed.data,
  });
  return c.json({ settings });
});

settingsRoute.get("/keys", async (c) => {
  const key = await getProviderKey(userId(c));
  return c.json({ key });
});

settingsRoute.put("/keys", async (c) => {
  const parsed = ProviderKeyInputSchema.safeParse(
    await c.req.json().catch(() => null)
  );
  if (!parsed.success) {
    throw new HTTPException(400, { message: "Invalid provider key" });
  }
  const key = await saveProviderKey({ userId: userId(c), input: parsed.data });
  return c.json({ key });
});

settingsRoute.delete("/keys", async (c) => {
  await deleteProviderKey(userId(c));
  return c.json({ ok: true });
});
