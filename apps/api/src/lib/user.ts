import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../types.ts";

/** The caller's id, guaranteed present by `requireAuth`. */
export function userId(c: Context<AppEnv>): string {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  return user.id;
}
