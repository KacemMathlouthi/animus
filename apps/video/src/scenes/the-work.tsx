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
import { LogoMark } from "@/components/logo-mark";
import {
	STUDIO_OFFSET_Y,
	STUDIO_SCALE,
	StudioFrame,
} from "@/components/studio-frame";
import { easeFluid, easeSnappy, enter, ramp } from "@/lib/motion";
import { sec } from "@/lib/timing";

/** Beat 02c. The agent works, and you can see it working.
 *
 * This is the beat that separates animus from a prompt box: research with real
 * sources, a plan you could have argued with, files written into a sandbox, a
 * render command run. It plays as a single unbroken shot with a slow push in,
 * so it reads as watching over someone's shoulder. */

const TITLE = "But what is a Fourier transform?";

const BEATS = {
	user: sec(0.1),
	reply: sec(0.6),
	search: sec(2.0),
	plan: sec(3.5),
	write: sec(5.6),
	render: sec(6.6),
};

/** What the right-hand panel is doing while the transcript fills. */
function WorkPanel(): React.JSX.Element {
	const frame = useCurrentFrame();

	const steps = [
		{ label: "Researching sources", at: BEATS.search },
		{ label: "Storyboarding scenes", at: BEATS.plan },
		{ label: "Writing the scene", at: BEATS.write },
		{ label: "Rendering", at: BEATS.render },
	];
	const active = steps.filter((step) => frame >= step.at).length || 1;
	const current = steps[active - 1];

	// Render progress only starts once the command is actually running.
	const progress = ramp(frame, BEATS.render, sec(3.4), easeFluid);

	return (
		<div className="flex h-full flex-col items-center justify-center gap-6 px-10">
			<LogoMark animate="loading" className="h-24 w-auto" />

			<div className="w-full max-w-[300px] space-y-3 text-center">
				<p className="font-medium text-[15px] text-foreground">
					{current.label}
				</p>

				<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
					<div
						className="h-full rounded-full bg-primary"
						style={{
							width: `${
								(frame >= BEATS.render
									? progress
									: interpolate(active, [0, 4], [0.08, 0.62])) * 100
							}%`,
						}}
					/>
				</div>

				<p className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
					{frame >= BEATS.render
						? `${Math.round(progress * 96)}% · 1080p60`
						: `step ${active} of 4`}
				</p>
			</div>
		</div>
	);
}

export function TheWork(): React.JSX.Element {
	const frame = useCurrentFrame();

	// The studio lands from the prompt's launch: it arrives slightly large and
	// settles, then the camera pushes in very slowly for the rest of the shot.
	const arrive = ramp(frame, 0, sec(1), easeSnappy);
	const push = interpolate(frame, [0, sec(9)], [0, 1], {
		extrapolateRight: "clamp",
	});
	const scale =
		STUDIO_SCALE *
		interpolate(arrive, [0, 1], [1.12, 1]) *
		interpolate(push, [0, 1], [1, 1.06]);

	// The transcript scrolls as it grows, keeping the newest card in frame.
	const scroll = interpolate(
		frame,
		[BEATS.plan, BEATS.write, BEATS.render, BEATS.render + sec(1.4)],
		[0, -60, -150, -196],
		{ easing: easeFluid, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);

	return (
		<Stage className="items-center justify-center">
			<AbsoluteFill
				className="items-center justify-center"
				style={{
					opacity: arrive,
					filter: `blur(${(1 - arrive) * 14}px)`,
				}}
			>
				<StudioFrame
					chat={
						<div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden p-5">
							<div
								className="space-y-3.5"
								style={{ transform: `translateY(${scroll}px)` }}
							>
								<UserMessage at={BEATS.user}>{TITLE}</UserMessage>

								<AssistantText
									at={BEATS.reply}
									text="On it. I'll ground this in real sources first, then storyboard it before a single frame is rendered."
								/>

								<SourcesCard
									at={BEATS.search}
									query="fourier transform intuition, epicycles, square wave"
									sources={[
										"3blue1brown.com",
										"betterexplained.com",
										"mathworld.wolfram.com",
									]}
								/>

								<PlanCard
									at={BEATS.plan}
									scenes={[
										"A signal you already know: the square wave",
										"One rotating vector, one pure tone",
										"Stacking harmonics tip to tail",
										"The sum draws the wave",
										"Why the transform is the same idea, backwards",
									]}
								/>

								<ToolLine
									at={BEATS.write}
									detail="fourier_transform.py"
									icon={toolIcons.write}
									title="Wrote file"
								/>

								<ToolLine
									at={BEATS.render}
									detail="manim -qh fourier_transform.py FourierScene"
									doneAfter={sec(2.6)}
									icon={toolIcons.run}
									title="Ran command"
								/>
							</div>
						</div>
					}
					panel={<WorkPanel />}
					style={{
						transform: `translateY(${STUDIO_OFFSET_Y}px) scale(${scale})`,
					}}
					title={TITLE}
				/>
			</AbsoluteFill>

			{/* A quiet caption naming what is happening, for the muted timeline. */}
			<AbsoluteFill className="items-center justify-end pb-9">
				<p
					className="font-mono text-[24px] text-muted-foreground uppercase tracking-[0.3em]"
					style={enter(ramp(frame, sec(1.4), sec(0.8)), { rise: 12, blur: 5 })}
				>
					It researches. It plans. It writes the code.
				</p>
			</AbsoluteFill>
		</Stage>
	);
}
