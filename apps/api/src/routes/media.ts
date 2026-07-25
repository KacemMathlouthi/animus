/** Mints short-lived presigned URLs for rendered videos stored in R2 and manages
 * public shares. The renderScene output carries only the object key; the web
 * calls these routes to resolve a key into a playable URL, force a download, or
 * publish a permanent unlisted share link. Authenticated and ownership-checked:
 * the key encodes its conversation id, and the caller must own that conversation. */

import { CreateShareInputSchema } from "@animus/core";
import { type Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  backgroundMusicUrl,
  isMusicTrackId,
  mediaKeyConversationId,
  signDownloadUrl,
  signMediaUrl,
} from "../lib/media.ts";
import { userId } from "../lib/user.ts";
import { requireAuth } from "../middleware/auth.ts";
import {
  ownedConversationTitle,
  userOwnsConversation,
} from "../services/conversations.ts";
import { createShare } from "../services/shares.ts";
import type { AppEnv } from "../types.ts";

export const mediaRoute = new Hono<AppEnv>();

mediaRoute.use("*", requireAuth);

/** Resolve a media key the caller owns, or throw 400/404. */
async function ownedKey(
  c: Context<AppEnv>,
  key: string | undefined
): Promise<string> {
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
  return key;
}

mediaRoute.get("/sign", async (c) => {
  const key = await ownedKey(c, c.req.query("key"));
  const url = await signMediaUrl(key);
  return c.json({ url });
});

/** Presigned URL for a catalog background track, so the settings picker can
 * preview the actual track a user would get. Not conversation-scoped — the
 * tracks are a fixed public-domain catalog — so it only validates the id. */
mediaRoute.get("/music-preview", async (c) => {
  const track = c.req.query("track") ?? "";
  if (!isMusicTrackId(track)) {
    throw new HTTPException(400, { message: "Unknown track" });
  }
  const url = await backgroundMusicUrl(track);
  return c.json({ url });
});

mediaRoute.get("/download", async (c) => {
  const key = await ownedKey(c, c.req.query("key"));
  const filename = c.req.query("filename") ?? "animus-video";
  const url = await signDownloadUrl(key, filename);
  return c.json({ url });
});

mediaRoute.post("/share", async (c) => {
  const parsed = CreateShareInputSchema.safeParse(
    await c.req.json().catch(() => null)
  );
  if (!parsed.success) {
    throw new HTTPException(400, { message: "Invalid media key" });
  }

  const { videoKey } = parsed.data;
  const conversationId = mediaKeyConversationId(videoKey);
  if (!conversationId) {
    throw new HTTPException(400, { message: "Invalid media key" });
  }

  const title = await ownedConversationTitle({
    conversationId,
    userId: userId(c),
  });
  if (title === null) {
    throw new HTTPException(404, { message: "Media not found" });
  }

  const { token } = await createShare({
    conversationId,
    userId: userId(c),
    videoKey,
    title,
  });
  return c.json({ token });
});
