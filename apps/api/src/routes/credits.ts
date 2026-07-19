/** The caller's credit balance and usage ledger. The balance read seeds the
 * row with the free grant on first touch. Authenticated — a user only ever
 * sees their own rows. */

import { Hono } from "hono";
import { z } from "zod";
import { userId } from "../lib/user.ts";
import { requireAuth } from "../middleware/auth.ts";
import { getOrCreateCredits, listUsage } from "../services/credits.ts";
import type { AppEnv } from "../types.ts";

export const creditsRoute = new Hono<AppEnv>();

creditsRoute.use("*", requireAuth);

creditsRoute.get("/", async (c) => {
  const balance = await getOrCreateCredits(userId(c));
  return c.json(balance);
});

/** Malformed values fall back to the defaults; out-of-range ones clamp. */
const UsageQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .catch(20)
    .transform((n) => Math.min(Math.max(n, 1), 100)),
  offset: z.coerce
    .number()
    .int()
    .catch(0)
    .transform((n) => Math.max(n, 0)),
});

creditsRoute.get("/usage", async (c) => {
  const { limit, offset } = UsageQuerySchema.parse({
    limit: c.req.query("limit") ?? 20,
    offset: c.req.query("offset") ?? 0,
  });
  const page = await listUsage({ userId: userId(c), limit, offset });
  return c.json(page);
});
