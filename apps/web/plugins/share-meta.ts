/** Dev-server plugin that gives a shared video's `/v/:token` URL a real
 * link-preview. A static SPA serves one index.html for every route, so a crawler
 * (X, Discord, Slack, iMessage…) only ever sees the default tags. This middleware
 * intercepts `/v/:token`, looks the share up via the API, and injects per-share
 * Open Graph / Twitter meta (branded card image + inline video) into index.html
 * before serving it — humans still boot the SPA as normal.
 *
 * This is the dev equivalent of what a production edge function (or a
 * meta-injecting reverse proxy) must do at the real host. The `/api` proxy in
 * vite.config routes the card/video/embed URLs through this same origin, so a
 * single public origin is enough. */

import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import {
  buildShareMetaTags,
  injectShareMeta,
  SHARE_META_DESCRIPTION,
} from "@animus/core";
import type { Logger, Plugin, ViteDevServer } from "vite";

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const V_ROUTE = /^\/v\/([\w-]+)\/?$/;

/** Public origin the crawler reached us on, honoring forwarded headers (behind a
 * proxy) so injected URLs are absolute and externally fetchable. */
function requestOrigin(req: IncomingMessage): string {
  const proto = String(req.headers["x-forwarded-proto"] ?? "http")
    .split(",")[0]
    .trim();
  const host = String(
    req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost"
  )
    .split(",")[0]
    .trim();
  return `${proto}://${host}`;
}

async function fetchShareTitle(
  apiTarget: string,
  token: string,
  logger: Logger
): Promise<string | null> {
  try {
    const res = await fetch(
      `${apiTarget}/api/share/${encodeURIComponent(token)}`
    );
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { title?: string };
    return typeof data.title === "string" ? data.title : null;
  } catch (error) {
    // A network/parse failure (e.g. the API is down) — surface it so a broken
    // preview isn't a silent mystery, then fall back to the default meta.
    logger.warn(
      `[animus-share-meta] share lookup failed for "${token}": ${describe(error)}`
    );
    return null;
  }
}

async function serveInjected(
  server: ViteDevServer,
  indexPath: string,
  apiTarget: string,
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void
): Promise<void> {
  const url = req.url ?? "";
  const pathname = url.split("?")[0] ?? "";
  const match = pathname.match(V_ROUTE);
  // Match GET /v/:token for any client. We must NOT gate on `Accept: text/html`
  // — crawlers like Twitterbot/Discordbot send `*/*` and would otherwise fall
  // through to the default page. Assets never match V_ROUTE, so this is safe.
  if (!match || (req.method && req.method !== "GET")) {
    next();
    return;
  }

  const token = match[1] ?? "";
  try {
    const title = await fetchShareTitle(apiTarget, token, server.config.logger);
    let html = readFileSync(indexPath, "utf8");
    if (title) {
      const origin = requestOrigin(req);
      const base = `${origin}/api/share/${token}`;
      html = injectShareMeta(
        html,
        buildShareMetaTags({
          title,
          description: SHARE_META_DESCRIPTION,
          pageUrl: `${origin}/v/${token}`,
          imageUrl: `${base}/og.png`,
          videoUrl: `${base}/video.mp4`,
          embedUrl: `${base}/embed`,
        })
      );
    }
    html = await server.transformIndexHtml(url, html);
    res.setHeader("Content-Type", "text/html");
    res.end(html);
  } catch (error) {
    server.config.logger.warn(
      `[animus-share-meta] meta injection failed for ${url}: ${describe(error)}`
    );
    next();
  }
}

/** Vite plugin: inject per-share link-preview meta for `/v/:token` in dev. */
export function shareMetaPlugin(options: { apiTarget: string }): Plugin {
  return {
    name: "animus-share-meta",
    configureServer(server: ViteDevServer) {
      const indexPath = join(server.config.root, "index.html");
      server.middlewares.use((req, res, next) => {
        void serveInjected(
          server,
          indexPath,
          options.apiTarget,
          req,
          res,
          next
        );
      });
    },
  };
}
