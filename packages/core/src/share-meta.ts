/** Link-preview `<head>` builders for a shared video. A static SPA serves one
 * index.html for every route, so per-share meta must be injected server-side at
 * the real `/v/:token` URL. Pure, so the dev plugin and the prod route build
 * identical markup. */

import { OG_HEIGHT, OG_WIDTH } from "./share-card.ts";

/** Must match the comments in apps/web/index.html verbatim. */
export const SHARE_META_START = "<!-- share-meta:start -->";
export const SHARE_META_END = "<!-- share-meta:end -->";

/** One string for both injection layers, dev plugin and prod route. */
export const SHARE_META_DESCRIPTION =
  "A narrated explainer, researched and animated by animus. Make your own in minutes.";

const PLAYER_WIDTH = 1280;
const PLAYER_HEIGHT = 720;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};
const HTML_UNSAFE = /[&<>"]/g;

export function escapeHtml(value: string): string {
  return value.replace(HTML_UNSAFE, (char) => HTML_ESCAPES[char] ?? char);
}

export interface ShareMetaInput {
  description: string;
  /** twitter:player iframe. Omit for an image-only card. */
  embedUrl?: string;
  imageUrl: string;
  pageUrl: string;
  title: string;
  /** A publicly fetchable mp4, which enables inline playback on Discord,
   * Telegram and Slack. Omit for an image-only card. */
  videoUrl?: string;
}

function meta(
  property: string,
  content: string,
  kind: "name" | "property"
): string {
  return `<meta ${kind}="${property}" content="${escapeHtml(content)}"/>`;
}

/** With a video URL this emits `og:video` and `twitter:card=player`; the image
 * is always the fallback. */
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

/** Returns the html unchanged when the markers are absent. */
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
