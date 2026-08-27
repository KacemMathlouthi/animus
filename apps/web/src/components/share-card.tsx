/** `buildShareCardSvg` as inline SVG, the same card the API rasterizes for
 * link previews. Inline rather than `<img src=data:svg>` so the external
 * `/features/*.webp` painting actually loads. */

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
      // biome-ignore lint/security/noDangerouslySetInnerHtml: svg comes from @animus/core's buildShareCardSvg, which escapes every interpolated value; there is no user-supplied markup
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
