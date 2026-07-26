/** The deterministic animus preview card as inline SVG, derived purely from a
 * video's title + seed via the shared `buildShareCardSvg` (@animus/core) — the
 * same design the API rasterizes for link previews.
 *
 * Rendered inline (not `<img src=data:svg>`) so the external `/features/*.webp`
 * painting actually loads; letterboxed to its container as the resting poster. */

import { buildShareCardSvg, shareImageName } from "@animus/core";
import { useMemo } from "react";

export function ShareCard({ title, seed }: { title: string; seed: string }) {
  const svg = useMemo(
    () =>
      buildShareCardSvg({
        title: title.trim() || "Untitled video",
        seed,
        imageHref: `/features/${shareImageName(seed)}.webp`,
        width: 1280,
        height: 720,
      }),
    [title, seed]
  );

  return (
    <div
      className="h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
