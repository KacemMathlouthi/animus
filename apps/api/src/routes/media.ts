/** Mints short-lived presigned URLs for rendered videos stored in R2. The
 * renderScene output carries only the object key; the web calls this route to
 * resolve a key into a playable URL. Authenticated and ownership-checked: the
 * key encodes its conversation id, and the caller must own that conversation. */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { mediaKeyConversationId, signMediaUrl } from "../lib/media.ts";
import { userId } from "../lib/user.ts";
import { requireAuth } from "../middleware/auth.ts";
import { userOwnsConversation } from "../services/conversations.ts";
import type { AppEnv } from "../types.ts";

export const mediaRoute = new Hono<AppEnv>();

mediaRoute.use("*", requireAuth);

mediaRoute.get("/sign", async (c) => {
  const key = c.req.query("key");
  const conversationId = key ? mediaKeyConversationId(key) : null;
  if (!(key && conversationId)) {
    throw new HTTPException(400, { message: "Invalid media key" });
  }

  const owned = await userOwnsConversation({
    conversationId,
    userId: userId(c),
  });
  if (!owned) {
    throw new HTTPException(404, { message: "Media not found" });
  }

  const url = await signMediaUrl(key);
  return c.json({ url });
});
