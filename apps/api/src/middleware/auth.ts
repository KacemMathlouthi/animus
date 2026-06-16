/** Auth context + guards. `sessionMiddleware` resolves the session from the
 * request cookies (in-process) and attaches the user/session to the context.
 * `requireAuth` rejects unauthenticated requests. */

import { auth } from "@animus/auth";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../types.ts";

export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const result = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", result?.user ?? null);
  c.set("session", result?.session ?? null);
  await next();
});

/**
 * Guard for protected routes: 401 unless a user is present. Reusable across all
 * authenticated endpoints — the first product route to use it lands later.
 * @public
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get("user")) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  await next();
});
