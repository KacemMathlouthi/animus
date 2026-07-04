/** Renders the animus share card to a PNG for Open Graph link previews. The card
 * SVG comes from the pure `buildShareCardSvg` in `@animus/core`; here we resolve
 * the seed's painting to a base64 jpg data-URI (resvg can't fetch or decode webp,
 * hence the pre-converted jpg) and rasterize with the bundled Geist fonts.
 * Generated per request, never stored — a pure function of title + seed. */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  buildShareCardSvg,
  OG_HEIGHT,
  OG_WIDTH,
  SHARE_IMAGES,
  shareImageName,
} from "@animus/core";
import { Resvg } from "@resvg/resvg-js";

/** Absolute paths to the bundled Geist TTFs, resolved relative to this module so
 * they work whether the API runs from source (Bun) or a built bundle. */
const FONT_FILES = ["Geist-SemiBold.ttf", "Geist-Regular.ttf"].map((name) =>
  fileURLToPath(new URL(`../../assets/fonts/${name}`, import.meta.url))
);

function loadPaintingDataUri(name: string): string {
  const bytes = readFileSync(
    fileURLToPath(
      new URL(`../../assets/share-images/${name}.jpg`, import.meta.url)
    )
  );
  return `data:image/jpeg;base64,${bytes.toString("base64")}`;
}

/** Preload the painting data-URIs once at module init (small, fixed set) so
 * rendering an OG image never touches disk on the request path. */
const PAINTING_DATA_URIS: Map<string, string> = new Map(
  SHARE_IMAGES.map((name) => [name, loadPaintingDataUri(name)])
);

function paintingDataUri(seed: string): string {
  const name = shareImageName(seed);
  return PAINTING_DATA_URIS.get(name) ?? loadPaintingDataUri(name);
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
