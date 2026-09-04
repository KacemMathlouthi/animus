/** Rasterizes `buildShareCardSvg` to a PNG for link previews. Paintings become
 * base64 jpg data-URIs because resvg can neither fetch nor decode webp. Assets
 * load lazily so a build missing apps/api/assets breaks only this surface. */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  buildShareCardSvg,
  OG_HEIGHT,
  OG_WIDTH,
  SHARE_IMAGES,
  shareImageName,
} from "@animus/core";
import { renderAsync } from "@resvg/resvg-js";

/** Relative to this module, so source and bundle both resolve. */
function assetPath(relative: string): string {
  return fileURLToPath(new URL(`../../assets/${relative}`, import.meta.url));
}

const FONT_FILES = ["Geist-SemiBold.ttf", "Geist-Regular.ttf"].map((name) =>
  assetPath(`fonts/${name}`)
);

function loadPaintingDataUri(name: string): string {
  const path = assetPath(`share-images/${name}.jpg`);
  let bytes: Buffer;
  try {
    bytes = readFileSync(path);
  } catch (error) {
    throw new Error(
      `share-card asset missing: ${path} — the apps/api/assets tree was not shipped with this build (check .vercelignore / .dockerignore)`,
      { cause: error }
    );
  }
  return `data:image/jpeg;base64,${bytes.toString("base64")}`;
}

/** Surfaced by /health so a build missing the assets shows up there rather
 * than on the first OG request. */
export function shareCardAssetsPresent(): boolean {
  const paths = [
    ...FONT_FILES,
    ...SHARE_IMAGES.map((name) => assetPath(`share-images/${name}.jpg`)),
  ];
  return paths.every((path) => existsSync(path));
}

/** Memoized on first use. Deliberately not loaded at module init. */
let paintingDataUris: Map<string, string> | null = null;

function paintingDataUri(seed: string): string {
  paintingDataUris ??= new Map(
    SHARE_IMAGES.map((name) => [name, loadPaintingDataUri(name)])
  );
  const name = shareImageName(seed);
  return paintingDataUris.get(name) ?? loadPaintingDataUri(name);
}

const FONT_OPTIONS = {
  fontFiles: FONT_FILES,
  defaultFontFamily: "Geist",
  loadSystemFonts: false,
};

async function rasterize(input: {
  title: string;
  seed: string;
}): Promise<Buffer> {
  const svg = buildShareCardSvg({
    title: input.title,
    seed: input.seed,
    imageHref: paintingDataUri(input.seed),
    width: OG_WIDTH,
    height: OG_HEIGHT,
  });
  // Async so rasterizing runs off the event loop. The sync API froze it for
  // ~55ms a card, and this route is public, uncached and CDN-less, so a shared
  // link fanning out to crawlers stalled every live SSE stream on the one task.
  const image = await renderAsync(svg, { font: FONT_OPTIONS });
  return image.asPng();
}

/** A card is ~600KB, so this bounds the cache near 10MB. One hot link needs a
 * single entry; the rest is headroom for several circulating at once. */
const CACHE_LIMIT = 16;
const cache = new Map<string, Buffer>();
/** A crawler burst hits one URL many times at once, before anything is cached,
 * so identical concurrent requests must share a single render. */
const inFlight = new Map<string, Promise<Buffer>>();

function remember(key: string, png: Buffer): void {
  cache.set(key, png);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }
}

/** Memoized because a card is a pure function of its title and seed. */
export function shareCardPng(input: {
  title: string;
  seed: string;
}): Promise<Buffer> {
  const key = `${input.seed}\u0000${input.title}`;

  const hit = cache.get(key);
  if (hit) {
    // Re-insert so the map's insertion order stays least-recently-used first.
    cache.delete(key);
    cache.set(key, hit);
    return Promise.resolve(hit);
  }

  const pending = inFlight.get(key);
  if (pending) {
    return pending;
  }

  const promise = rasterize(input)
    .then((png) => {
      remember(key, png);
      return png;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}
