/** Pure builders for a shared video's link-preview `<head>` — the Open Graph /
 * Twitter Card meta a crawler reads, plus the helper that splices it into the
 * SPA's index.html. Kept pure (no `node:*`, no env) so the web's Vite dev plugin
 * (and any prod edge injector) can build identical markup.
 *
 * A static SPA serves one index.html for every route, so per-share meta must be
 * injected server-side at the real `/v/:token` URL. index.html wraps its default
 * tags between the markers below; the injector swaps that region per share. */

import { OG_HEIGHT, OG_WIDTH } from "./share-card.ts";

/** Markers in index.html delimiting the replaceable meta region. Must match the
 * comments in apps/web/index.html verbatim. */
export const SHARE_META_START = "<!-- share-meta:start -->";
export const SHARE_META_END = "<!-- share-meta:end -->";

/** Default player embed dimensions (our videos are 16:9). */
const PLAYER_WIDTH = 1280;
const PLAYER_HEIGHT = 720;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};
const HTML_UNSAFE = /[&<>"]/g;

/** Escape for HTML text and double-quoted attribute values. */
export function escapeHtml(value: string): string {
  return value.replace(HTML_UNSAFE, (char) => HTML_ESCAPES[char] ?? char);
}

export interface ShareMetaInput {
  description: string;
  /** Absolute URL of the iframe player embed (twitter:player). Omit for image-only. */
  embedUrl?: string;
  /** Absolute URL of the PNG share card (og:image / twitter:image). */
  imageUrl: string;
  /** Canonical page URL (og:url) — the `/v/:token` share page. */
  pageUrl: string;
  title: string;
  /** Absolute URL of a direct, publicly-fetchable mp4 (enables og:video and
   * inline playback on Discord/Telegram/Slack). Omit for an image-only card. */
  videoUrl?: string;
}

function meta(
  property: string,
  content: string,
  kind: "name" | "property"
): string {
  return `<meta ${kind}="${property}" content="${escapeHtml(content)}"/>`;
}

/** Build the per-share `<title>` + OG/Twitter meta block. When a video URL is
 * supplied it emits `og:video` and a `twitter:card=player`, so platforms that
 * support it render an inline player; the image is always the fallback. */
export function buildShareMetaTags(input: ShareMetaInput): string {
  const tags: string[] = [
    `<title>${escapeHtml(input.title)} · animus</title>`,
    meta("description", input.description, "name"),
    meta("og:site_name", "animus", "property"),
    meta("og:title", input.title, "property"),
    meta("og:description", input.description, "property"),
    meta("og:url", input.pageUrl, "property"),
    meta("og:image", input.imageUrl, "property"),
    meta("og:image:width", String(OG_WIDTH), "property"),
    meta("og:image:height", String(OG_HEIGHT), "property"),
    meta("og:image:type", "image/png", "property"),
  ];

  if (input.videoUrl && input.embedUrl) {
    tags.push(
      meta("og:type", "video.other", "property"),
      meta("og:video", input.videoUrl, "property"),
      meta("og:video:url", input.videoUrl, "property"),
      meta("og:video:secure_url", input.videoUrl, "property"),
      meta("og:video:type", "video/mp4", "property"),
      meta("og:video:width", String(PLAYER_WIDTH), "property"),
      meta("og:video:height", String(PLAYER_HEIGHT), "property"),
      meta("twitter:card", "player", "name"),
      meta("twitter:player", input.embedUrl, "name"),
      meta("twitter:player:width", String(PLAYER_WIDTH), "name"),
      meta("twitter:player:height", String(PLAYER_HEIGHT), "name"),
      meta("twitter:player:stream", input.videoUrl, "name"),
      meta("twitter:player:stream:content_type", "video/mp4", "name")
    );
  } else {
    tags.push(
      meta("og:type", "website", "property"),
      meta("twitter:card", "summary_large_image", "name")
    );
  }

  tags.push(
    meta("twitter:title", input.title, "name"),
    meta("twitter:description", input.description, "name"),
    meta("twitter:image", input.imageUrl, "name")
  );

  return tags.join("\n    ");
}

/** Replace the marked meta region of an index.html with `metaBlock`. Returns the
 * html unchanged if the markers are absent (safe no-op). */
export function injectShareMeta(html: string, metaBlock: string): string {
  const start = html.indexOf(SHARE_META_START);
  const end = html.indexOf(SHARE_META_END);
  if (start === -1 || end === -1 || end < start) {
    return html;
  }
  const before = html.slice(0, start + SHARE_META_START.length);
  const after = html.slice(end);
  return `${before}\n    ${metaBlock}\n    ${after}`;
}
