import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EdgeLines, Stage } from "@/components/chrome";
import { Headline, WordsIn } from "@/components/type";
import { easeFluid, ramp, window_ } from "@/lib/motion";
import { sec } from "@/lib/timing";

/** Beat 04a. The reason the product exists.
 *
 * Three statements, each one replacing the last with a vertical push, so the
 * argument physically stacks. This is the only moment in the film with no
 * interface on screen: the claim has to stand on its own. */

const LINES = [
	{
		at: sec(0.2),
		until: sec(3.3),
		text: "Everyone is building AI that thinks *for* you.",
	},
	{
		at: sec(3.1),
		until: sec(6.2),
		text: "animus builds AI that makes *you* smarter.",
	},
	{ at: sec(6.0), until: sec(9.2), text: "Curiosity in. *Understanding* out." },
];

export function TheMessage(): React.JSX.Element {
	const frame = useCurrentFrame();

	return (
		<Stage>
			<EdgeLines opacity={0.8} />

			{/* A slow warm bloom that rises through the beat: the film heating up
          into the call to action. */}
			<AbsoluteFill
				style={{
					background:
						"radial-gradient(ellipse 70% 55% at 50% 55%, color-mix(in srgb, var(--primary) 12%, transparent), transparent 70%)",
					opacity: ramp(frame, 0, sec(9), easeFluid),
				}}
			/>

			<AbsoluteFill className="items-center justify-center px-40">
				{LINES.map((line) => {
					const visible = window_(frame, line.at, line.until, sec(0.55));
					// Lines arrive from below and leave upward, one pushing out the next.
					const gone = ramp(
						frame,
						line.until - sec(0.55),
						sec(0.55),
						easeFluid,
					);
					const arriving = 1 - ramp(frame, line.at, sec(0.55), easeFluid);

					return (
						<Headline
							className="absolute max-w-[1600px] text-center text-[86px] leading-[1.12]"
							key={line.text}
							style={{
								opacity: visible,
								filter: `blur(${(arriving + gone) * 8}px)`,
								transform: `translateY(${arriving * 60 - gone * 60}px)`,
							}}
						>
							<WordsIn
								duration={sec(0.5)}
								start={line.at}
								step={2.5}
								text={line.text}
							/>
						</Headline>
					);
				})}
			</AbsoluteFill>
		</Stage>
	);
}
