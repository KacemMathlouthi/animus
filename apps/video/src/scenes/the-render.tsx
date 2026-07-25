import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
	AssistantText,
	PlanCard,
	SourcesCard,
	ToolLine,
	toolIcons,
	UserMessage,
} from "@/components/chat-parts";
import { Stage } from "@/components/chrome";
import { FourierScene } from "@/components/fourier-scene";
import {
	STUDIO_OFFSET_Y,
	STUDIO_SCALE,
	StudioFrame,
} from "@/components/studio-frame";
import { Waveform } from "@/components/waveform";
import { easeFluid, easeSnappy, enter, ramp, window_ } from "@/lib/motion";
import { sec } from "@/lib/timing";

/** Beat 02d. The payoff.
 *
 * The scene opens on the same studio the last shot ended in, with the render
 * now playing in the panel, then pushes the camera straight into that panel
 * until the explainer is the whole screen. No cut: the product becomes the
 * video it makes. The narration is subtitled because most of this will be
 * watched muted on a timeline. */

const TITLE = "But what is a Fourier transform?";

/** The panel the camera flies into, in the studio's own coordinates: the
 * right-hand section starts at 1280 − 560 and the content area sits below the
 * 56px header. */
const PANEL = { centerX: 1000, centerY: 408, width: 560 };
const STUDIO = { centerX: 640, centerY: 380 };
const FULL_SCALE = 1920 / PANEL.width;
/** Where the previous scene left the camera, so the join is invisible. */
const HANDOVER_SCALE = STUDIO_SCALE * 1.06;

const ZOOM_START = sec(1.5);
const ZOOM_END = sec(3.3);

/** Anything already on screen when this scene starts entered long ago. */
const PAST = -sec(5);
/** Where the previous shot's transcript had scrolled to. */
const SCROLL_IN = -196;

const SUBTITLES = [
	{
		at: sec(3.4),
		until: sec(5.4),
		text: "A square wave looks nothing like a sine wave.",
	},
	{
		at: sec(5.5),
		until: sec(7.6),
		text: "But stack enough of them, each turning at its own speed…",
	},
	{ at: sec(7.7), until: sec(9.9), text: "…and the sum draws it exactly." },
];

export function TheRender(): React.JSX.Element {
	const frame = useCurrentFrame();

	const zoom = ramp(frame, ZOOM_START, ZOOM_END - ZOOM_START, easeFluid);
	const scale = interpolate(zoom, [0, 1], [HANDOVER_SCALE, FULL_SCALE], {
		easing: easeSnappy,
	});
	// Keep the panel's centre pinned to the frame's centre throughout the move,
	// and let the pre-zoom vertical offset decay away as the camera commits.
	const dx = -(PANEL.centerX - STUDIO.centerX) * scale * zoom;
	const dy =
		-(PANEL.centerY - STUDIO.centerY) * scale * zoom +
		STUDIO_OFFSET_Y * (1 - zoom);

	// The transcript scrolls once more as the closing line lands.
	const scroll = interpolate(
		frame,
		[0, sec(1.2)],
		[SCROLL_IN, SCROLL_IN - 62],
		{
			easing: easeFluid,
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		},
	);

	return (
		<Stage grain={false}>
			<AbsoluteFill className="items-center justify-center">
				<StudioFrame
					chat={
						// The same transcript the previous shot ended on, so the join
						// between the two studio scenes is invisible; only the closing
						// line and the scroll are new.
						<div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden p-5">
							<div
								className="space-y-3.5"
								style={{ transform: `translateY(${scroll}px)` }}
							>
								<UserMessage at={PAST}>{TITLE}</UserMessage>
								<AssistantText
									at={PAST}
									text="On it. I'll ground this in real sources first, then storyboard it before a single frame is rendered."
									wordsPerSecond={1000}
								/>
								<SourcesCard
									at={PAST}
									query="fourier transform intuition, epicycles, square wave"
									sources={[
										"3blue1brown.com",
										"betterexplained.com",
										"mathworld.wolfram.com",
									]}
								/>
								<PlanCard
									at={PAST}
									scenes={[
										"A signal you already know: the square wave",
										"One rotating vector, one pure tone",
										"Stacking harmonics tip to tail",
										"The sum draws the wave",
										"Why the transform is the same idea, backwards",
									]}
								/>
								<ToolLine
									at={PAST}
									detail="fourier_transform.py"
									doneAfter={0}
									icon={toolIcons.write}
									title="Wrote file"
								/>
								<ToolLine
									at={PAST}
									detail="manim -qh fourier_transform.py FourierScene"
									doneAfter={0}
									icon={toolIcons.run}
									title="Ran command"
								/>
								<AssistantText
									at={sec(0.3)}
									text="Here it is: narrated, synced to the animation, ready to share."
								/>
							</div>
						</div>
					}
					panel={
						<div className="flex h-full items-center justify-center">
							{/* The rendered video, sitting in the panel exactly as the app
                  plays it back. It is an SVG, so flying the camera into it
                  costs no sharpness. */}
							<div
								className="w-full overflow-hidden"
								style={{ aspectRatio: "16 / 9" }}
							>
								<FourierScene height={315} startFrame={0} width={560} />
							</div>
						</div>
					}
					style={{ transform: `translate(${dx}px, ${dy}px) scale(${scale})` }}
					title={TITLE}
				/>
			</AbsoluteFill>

			{/* Subtitles + waveform live in screen space, above the camera move. */}
			<AbsoluteFill className="pointer-events-none">
				{SUBTITLES.map((line) => {
					const visible = window_(frame, line.at, line.until, sec(0.3));
					return (
						<p
							className="absolute inset-x-0 bottom-[152px] mx-auto max-w-[1400px] text-center font-medium text-[40px] text-foreground tracking-tight"
							key={line.text}
							style={{
								...enter(visible, { rise: 10, blur: 6 }),
								textShadow: "0 2px 24px rgba(0,0,0,0.9)",
							}}
						>
							{line.text}
						</p>
					);
				})}

				<div className="absolute inset-x-0 bottom-[72px] flex justify-center">
					<Waveform opacity={ramp(frame, sec(3.2), sec(0.8)) * 0.85} />
				</div>
			</AbsoluteFill>

			{/* The one label the beat needs, before the subtitles take over. */}
			<AbsoluteFill className="items-center justify-end pb-4">
				<p
					className="font-mono text-[22px] text-muted-foreground uppercase tracking-[0.3em]"
					style={{
						opacity: window_(frame, 0, ZOOM_START + sec(0.4), sec(0.5)),
					}}
				>
					Then it renders the video
				</p>
			</AbsoluteFill>
		</Stage>
	);
}
