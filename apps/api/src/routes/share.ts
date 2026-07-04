/** Public, UNAUTHENTICATED resolution of a video share token. Given an unlisted
 * token, returns the video's title and a freshly minted presigned playback URL so
 * anyone with the link can watch — no session required. Creation of shares is the
 * authenticated `POST /api/media/share`; this route is read-only and never
 * exposes the underlying object key or conversation. */

import { escapeHtml, PublicShareResponseSchema } from "@animus/core";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { signDownloadUrl, signMediaUrl } from "../lib/media.ts";
import { renderShareCardPng } from "../lib/og.ts";
import { getShareByToken } from "../services/shares.ts";
import type { AppEnv } from "../types.ts";

export const shareRoute = new Hono<AppEnv>();

/** Minimal, self-contained iframe player for `twitter:player` — a full-bleed
 * video with native controls. `token` is the stored (safe) share token. */
function embedHtml(token: string, title: string): string {
  const video = `/api/share/${token}/video.mp4`;
  const poster = `/api/share/${token}/og.png`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)} · animus</title>
<style>html,body{margin:0;height:100%;background:#0b0a0a}video{width:100%;height:100%;object-fit:contain;display:block}</style>
</head>
<body>
<video autoplay controls muted playsinline poster="${poster}" src="${video}"></video>
</body>
</html>`;
}

/** Runtime-rendered PNG share card for link previews (Open Graph). Public and
 * unauthenticated — crawlers fetch it without cookies. Derived purely from the
 * share's title + token; nothing is stored, so a day-long cache is safe. */
shareRoute.get("/:token/og.png", async (c) => {
  const share = await getShareByToken(c.req.param("token"));
  if (!share) {
    throw new HTTPException(404, { message: "Share not found" });
  }
  const png = renderShareCardPng({ title: share.title, seed: share.token });
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
});

/** Stable public mp4 URL for `og:video` — 302s to a fresh presigned R2 URL each
 * time (the underlying presign expires, so this is only briefly cacheable). */
shareRoute.get("/:token/video.mp4", async (c) => {
  const share = await getShareByToken(c.req.param("token"));
  if (!share) {
    throw new HTTPException(404, { message: "Share not found" });
  }
  const url = await signMediaUrl(share.videoKey);
  c.header("Cache-Control", "public, max-age=300");
  return c.redirect(url, 302);
});

/** The `twitter:player` iframe target — an inline video player crawlers can embed. */
shareRoute.get("/:token/embed", async (c) => {
  const share = await getShareByToken(c.req.param("token"));
  if (!share) {
    throw new HTTPException(404, { message: "Share not found" });
  }
  return c.html(embedHtml(share.token, share.title));
});

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
