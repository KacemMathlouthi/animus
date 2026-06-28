/** Public, UNAUTHENTICATED resolution of a video share token. Given an unlisted
 * token, returns the video's title and a freshly minted presigned playback URL so
 * anyone with the link can watch — no session required. Creation of shares is the
 * authenticated `POST /api/media/share`; this route is read-only and never
 * exposes the underlying object key or conversation. */

import { PublicShareResponseSchema } from "@animus/core";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { signDownloadUrl, signMediaUrl } from "../lib/media.ts";
import { getShareByToken } from "../services/shares.ts";
import type { AppEnv } from "../types.ts";

export const shareRoute = new Hono<AppEnv>();

shareRoute.get("/:token", async (c) => {
  const share = await getShareByToken(c.req.param("token"));
  if (!share) {
    throw new HTTPException(404, { message: "Share not found" });
  }

  const [videoUrl, downloadUrl] = await Promise.all([
    signMediaUrl(share.videoKey),
    signDownloadUrl(share.videoKey, share.title),
  ]);
  return c.json(
    PublicShareResponseSchema.parse({
      title: share.title,
      videoUrl,
      downloadUrl,
    })
  );
});
