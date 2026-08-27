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
import { Resvg } from "@resvg/resvg-js";

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
