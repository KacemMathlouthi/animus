/** Renders the animus share card to a PNG for Open Graph link previews. The card
 * SVG comes from the pure `buildShareCardSvg` in `@animus/core`; here we resolve
 * the seed's painting to a base64 jpg data-URI (resvg can't fetch or decode webp,
 * hence the pre-converted jpg) and rasterize with the bundled Geist fonts.
 * Generated per request, never stored — a pure function of title + seed.
 *
 * Assets load lazily on first render and are memoized: a build that ships
 * without the apps/api/assets tree must break only this surface (with an error
 * naming the missing file), never the whole API at boot. */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  buildShareCardSvg,
  OG_HEIGHT,
  OG_WIDTH,
  SHARE_IMAGES,
  shareImageName,
} from "@animus/core";
import { Resvg } from "@resvg/resvg-js";

/** Absolute path of a bundled asset, resolved relative to this module so it
 * works whether the API runs from source (Bun) or a built bundle. */
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

/** Cheap existence probe over every bundled asset the renderer needs. Surfaced
 * by /health so a build shipped without apps/api/assets is visible immediately
 * on the health page, not on the first OG request. */
export function shareCardAssetsPresent(): boolean {
  const paths = [
    ...FONT_FILES,
    ...SHARE_IMAGES.map((name) => assetPath(`share-images/${name}.jpg`)),
  ];
  return paths.every((path) => existsSync(path));
}

/** Painting data-URIs, loaded on first use (small, fixed set) and memoized so
 * later renders never touch disk. Deliberately NOT loaded at module init. */
let paintingDataUris: Map<string, string> | null = null;

function paintingDataUri(seed: string): string {
  paintingDataUris ??= new Map(
    SHARE_IMAGES.map((name) => [name, loadPaintingDataUri(name)])
  );
  const name = shareImageName(seed);
  return paintingDataUris.get(name) ?? loadPaintingDataUri(name);
}

/** Render the share card for a title + seed to PNG bytes at Open Graph size. */
export function renderShareCardPng(input: {
  title: string;
  seed: string;
}): Buffer {
  const svg = buildShareCardSvg({
    title: input.title,
    seed: input.seed,
    imageHref: paintingDataUri(input.seed),
    width: OG_WIDTH,
    height: OG_HEIGHT,
  });
  const resvg = new Resvg(svg, {
    font: {
      fontFiles: FONT_FILES,
      defaultFontFamily: "Geist",
      loadSystemFonts: false,
    },
  });
  return resvg.render().asPng();
}
