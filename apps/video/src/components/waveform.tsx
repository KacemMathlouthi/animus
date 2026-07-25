import { useCurrentFrame } from "remotion";
import { cn } from "@/lib/utils";

/** The narration level meter.
 *
 * Two things need to say "there is a voice on this track": the render beat,
 * under the subtitles, and the narration feature card. Both use this, so the
 * speech reads as the same voice in both places.
 *
 * The levels are a fast syllable rate layered over a slower breath envelope,
 * both driven off the frame, so the meter is deterministic and identical on
 * every re-render of a given frame. */

/** Stable identities for the bars, so nothing is keyed by array position. */
const BAR_IDS: Record<number, string[]> = {};

function barIds(count: number): string[] {
	BAR_IDS[count] ??= Array.from(
		{ length: count },
		(_, index) => `bar-${index}`,
	);
	return BAR_IDS[count];
}

export function Waveform({
	bars = 68,
	opacity = 1,
	className,
	speed = 0.22,
}: {
	bars?: number;
	opacity?: number;
	className?: string;
	/** Radians per frame of the syllable rate. */
	speed?: number;
}): React.JSX.Element {
	const frame = useCurrentFrame();

	return (
		<div
			className={cn("flex h-9 items-center gap-[3px]", className)}
			style={{ opacity }}
		>
			{barIds(bars).map((id, index) => {
				const level = Math.min(
					1,
					0.28 +
						0.36 * Math.abs(Math.sin(index * 0.7 + frame * speed)) +
						0.3 * Math.abs(Math.sin(index * 0.21 + frame * 0.06)),
				);

				return (
					<span
						className="w-[3px] rounded-full bg-primary/70"
						key={id}
						style={{ height: `${level * 100}%` }}
					/>
				);
			})}
		</div>
	);
}
