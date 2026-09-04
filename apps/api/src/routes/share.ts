/** Unauthenticated resolution of a share token: anyone with the link watches,
 * no session. Read-only, and never exposes the object key or conversation.
 * Shares are created by the authenticated `POST /api/media/share`. */

import {
  buildShareMetaTags,
  escapeHtml,
  injectShareMeta,
  PublicShareResponseSchema,
  SHARE_META_DESCRIPTION,
} from "@animus/core";
import { getServerEnv } from "@animus/core/env";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { signDownloadUrl, signMediaUrl } from "../lib/media.ts";
import { shareCardPng } from "../lib/og.ts";
import { getShareByToken } from "../services/shares.ts";
import type { AppEnv } from "../types.ts";

export const shareRoute = new Hono<AppEnv>();

/** The `twitter:player` iframe body. `token` is the stored, safe token. */
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

/** Crawlers fetch this without cookies. Purely a function of title and token,
 * so a day-long cache is safe. */
shareRoute.get("/:token/og.png", async (c) => {
  const share = await getShareByToken(c.req.param("token"));
  if (!share) {
    throw new HTTPException(404, { message: "Share not found" });
  }
  const png = await shareCardPng({ title: share.title, seed: share.token });
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
});

/** Stable `og:video` URL that 302s to a fresh presign, which is why it is only
 * briefly cacheable. */
shareRoute.get("/:token/video.mp4", async (c) => {
  const share = await getShareByToken(c.req.param("token"));
  if (!share) {
    throw new HTTPException(404, { message: "Share not found" });
  }
  const url = await signMediaUrl(share.videoKey);
  c.header("Cache-Control", "public, max-age=300");
  return c.redirect(url, 302);
});

/** Cached because it changes only on a web deploy, and a crawler burst must
 * not fetch the origin once per hit. */
const SHELL_CACHE_TTL_MS = 5 * 60 * 1000;
let shellCache: { html: string; fetchedAt: number } | null = null;

async function fetchSpaShell(webOrigin: string): Promise<string> {
  const now = Date.now();
  if (shellCache && now - shellCache.fetchedAt < SHELL_CACHE_TTL_MS) {
    return shellCache.html;
  }
  const res = await fetch(`${webOrigin}/`, {
    headers: { accept: "text/html" },
  });
  if (!res.ok) {
    throw new HTTPException(503, { message: "Share page unavailable" });
  }
  const html = await res.text();
  shellCache = { html, fetchedAt: now };
  return html;
}

/** The SPA shell with per-share meta spliced in; the web rewrites `/v/:token`
 * here so crawlers see OG tags a static SPA cannot emit. Humans boot the SPA as
 * normal and unknown tokens get the plain shell. Prod counterpart of the dev
 * plugin in apps/web/plugins/share-meta.ts. */
shareRoute.get("/:token/page", async (c) => {
  const { webOrigin, apiOrigin } = getServerEnv();
  const [share, shell] = await Promise.all([
    getShareByToken(c.req.param("token")),
    fetchSpaShell(webOrigin),
  ]);
  c.header("Cache-Control", "public, max-age=300");
  if (!share) {
    return c.html(shell);
  }
  // The API's origin, never the web's: prod dropped the web's /api proxy, so a
  // web-origin asset URL falls through to the SPA catch-all and answers 200
  // text/html. Crawlers asking for a PNG got HTML, and nothing errored.
  const base = `${apiOrigin}/api/share/${share.token}`;
  return c.html(
    injectShareMeta(
      shell,
      buildShareMetaTags({
        title: share.title,
        description: SHARE_META_DESCRIPTION,
        pageUrl: `${webOrigin}/v/${share.token}`,
        imageUrl: `${base}/og.png`,
        videoUrl: `${base}/video.mp4`,
        embedUrl: `${base}/embed`,
      })
    )
  );
});

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
