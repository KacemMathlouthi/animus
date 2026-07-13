/** Per-user settings: generation defaults and BYO provider keys (one LLM, one
 * TTS). All routes require auth and operate only on the caller's own rows.
 * Provider keys are validated with a cheap test call, then encrypted before they
 * touch the database; only a masked preview is ever returned to the client. */

import {
  GenerationSettingsSchema,
  KeyKindSchema,
  ProviderKeyInputSchema,
} from "@animus/core";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { userId } from "../lib/user.ts";
import { requireAuth } from "../middleware/auth.ts";
import {
  validateLlmKey,
  validateTtsKey,
} from "../services/provider-validation.ts";
import {
  deleteProviderKey,
  getGenerationSettings,
  getProviderKeys,
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
  const keys = await getProviderKeys(userId(c));
  return c.json({ keys });
});

settingsRoute.put("/keys", async (c) => {
  const parsed = ProviderKeyInputSchema.safeParse(
    await c.req.json().catch(() => null)
  );
  if (!parsed.success) {
    throw new HTTPException(400, { message: "Invalid provider key" });
  }

  const input = parsed.data;
  const valid =
    input.kind === "llm"
      ? await validateLlmKey(input.provider, input.key.trim())
      : await validateTtsKey(input.key.trim());
  if (!valid) {
    throw new HTTPException(400, {
      message:
        "That key could not be verified with the provider. Check it and try again.",
    });
  }

  const key = await saveProviderKey({ userId: userId(c), input });
  return c.json({ key });
});

settingsRoute.delete("/keys", async (c) => {
  const parsed = KeyKindSchema.safeParse(c.req.query("kind"));
  if (!parsed.success) {
    throw new HTTPException(400, { message: "Invalid key kind" });
  }
  await deleteProviderKey(userId(c), parsed.data);
  return c.json({ ok: true });
});
