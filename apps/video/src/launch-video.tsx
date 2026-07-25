import {
	AbsoluteFill,
	Audio,
	interpolate,
	Sequence,
	staticFile,
	useCurrentFrame,
} from "remotion";
import { easeSnappy } from "@/lib/motion";
import { SOUNDTRACK_FILE, SOUNDTRACK_START_SECONDS } from "@/lib/score";
import {
	CROSSFADE,
	FPS,
	SCENES,
	type SceneId,
	sec,
	TOTAL_FRAMES,
} from "@/lib/timing";
import { BrandTurn } from "@/scenes/brand-turn";
import { ColdOpen } from "@/scenes/cold-open";
import { Features } from "@/scenes/features";
import { NothingSticks } from "@/scenes/nothing-sticks";
import { TheAsk } from "@/scenes/the-ask";
import { TheMessage } from "@/scenes/the-message";
import { ThePrompt } from "@/scenes/the-prompt";
import { TheRender } from "@/scenes/the-render";
import { TheWork } from "@/scenes/the-work";

/** The cut.
 *
 * Scenes are laid out back to back from `SCENES`, overlapping by `CROSSFADE`
 * so every join is a short dissolve rather than a hard snap. Retiming the film
 * means editing `lib/timing.ts` and nothing else. */

const SCENE_COMPONENTS: Record<SceneId, () => React.JSX.Element> = {
	"cold-open": ColdOpen,
	"nothing-sticks": NothingSticks,
	"brand-turn": BrandTurn,
	"the-prompt": ThePrompt,
	"the-work": TheWork,
	"the-render": TheRender,
	features: Features,
	"the-message": TheMessage,
	"the-ask": TheAsk,
};

export type LaunchVideoProps = {
	/** Mix the score under the film. Off renders the picture silent, which is
	 * how the edit is reviewed before the licensed track is dropped in. */
	soundtrack: boolean;
};

/** Score bed: "In the Hall of the Mountain King" (Reznor/Ross). It starts
 * almost inaudible under the cold open, climbs through the demo the way the
 * arrangement does, and is pulled back under the closing line so the sentence
 * is the last thing heard. */
function Score(): React.JSX.Element {
	return (
		<Audio
			src={staticFile(SOUNDTRACK_FILE)}
			trimBefore={SOUNDTRACK_START_SECONDS * FPS}
			volume={(f) =>
				interpolate(
					f,
					[
						0,
						sec(2),
						sec(13),
						sec(40),
						sec(56),
						TOTAL_FRAMES - sec(2.5),
						TOTAL_FRAMES,
					],
					[0, 0.28, 0.4, 0.75, 0.85, 0.5, 0],
					{
						easing: easeSnappy,
						extrapolateLeft: "clamp",
						extrapolateRight: "clamp",
					},
				)
			}
		/>
	);
}

export function LaunchVideo({
	soundtrack,
}: LaunchVideoProps): React.JSX.Element {
	let cursor = 0;

	return (
		<AbsoluteFill className="dark bg-background">
			{SCENES.map((scene) => {
				const Component = SCENE_COMPONENTS[scene.id];
				const from = cursor;
				const duration = sec(scene.seconds);
				cursor += duration - CROSSFADE;

				return (
					<Sequence
						durationInFrames={duration}
						from={from}
						key={scene.id}
						name={scene.id}
						// A scene fades in over the tail of the one before it.
						style={{ opacity: 1 }}
					>
						<Dissolve duration={duration}>
							<Component />
						</Dissolve>
					</Sequence>
				);
			})}

			{soundtrack ? <Score /> : null}
		</AbsoluteFill>
	);
}

/** Cross-dissolve at both ends of a scene, matched to `CROSSFADE`. */
function Dissolve({
	children,
	duration,
}: {
	children: React.ReactNode;
	duration: number;
}): React.JSX.Element {
	const frame = useCurrentFrame();
	const opacity = interpolate(
		frame,
		[0, CROSSFADE, duration - CROSSFADE, duration],
		[0, 1, 1, 0],
		{ easing: easeSnappy, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);

	return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}
