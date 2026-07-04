/** The deterministic animus preview card, rendered as inline SVG. Derived purely
 * from a video's title + a seed (no network, nothing stored) and byte-compatible
 * with the design the API rasterizes for link previews — both call the shared
 * `buildShareCardSvg` in @animus/core.
 *
 * Rendered inline (not via `<img src=data:svg>`) so the external `/features/*.webp`
 * painting on the right actually loads. The SVG keeps its viewBox aspect and is
 * sized to its container, so it fits fully (letterboxed) as the resting poster
 * over the video player in the studio and on the public share page. */

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
		[title, seed],
	);

	return (
		<div
			className="h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
			dangerouslySetInnerHTML={{ __html: svg }}
		/>
	);
}
