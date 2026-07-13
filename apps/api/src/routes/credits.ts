/** The caller's credit balance. Seeds the balance row with the free grant on
 * first read. Authenticated — a user only ever sees their own balance. */

import { Hono } from "hono";
import { userId } from "../lib/user.ts";
import { requireAuth } from "../middleware/auth.ts";
import { getOrCreateCredits } from "../services/credits.ts";
import type { AppEnv } from "../types.ts";

export const creditsRoute = new Hono<AppEnv>();

creditsRoute.use("*", requireAuth);

creditsRoute.get("/", async (c) => {
  const balance = await getOrCreateCredits(userId(c));
  return c.json(balance);
});
