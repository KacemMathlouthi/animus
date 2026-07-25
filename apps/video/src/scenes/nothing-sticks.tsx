import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EdgeLines, Stage } from "@/components/chrome";
import { Headline, Kicker, WordsIn } from "@/components/type";
import { easeFluid, enter, ramp } from "@/lib/motion";
import { sec } from "@/lib/timing";

/** Beat 01b. The problem, now stated once and left alone.
 *
 * Still cold, still unbranded, but the edge hairlines fade up underneath: the
 * first hint that a product is about to arrive. */

export function NothingSticks(): React.JSX.Element {
	const frame = useCurrentFrame();

	const kicker = ramp(frame, sec(0.2), sec(0.6));
	const lines = ramp(frame, sec(1.9), sec(0.8));
	// The whole card eases away at the tail so the brand cut can land clean.
	const exit = ramp(frame, sec(4.1), sec(0.9), easeFluid);

	return (
		<Stage>
			<AbsoluteFill style={{ background: "#08080a", opacity: 1 - exit }} />
			<EdgeLines opacity={ramp(frame, sec(0.8), sec(1.6)) * 0.8} />

			<AbsoluteFill
				className="items-center justify-center"
				style={{
					opacity: 1 - exit,
					filter: `blur(${exit * 12}px)`,
					transform: `scale(${1 + exit * 0.04})`,
				}}
			>
				<div className="flex max-w-[1300px] flex-col items-center gap-8 text-center">
					<Kicker progress={kicker}>The problem</Kicker>

					<Headline className="text-[120px] leading-[0.98]">
						<WordsIn
							duration={sec(0.55)}
							start={sec(0.6)}
							step={4}
							text="Nothing *sticks*."
						/>
					</Headline>

					<p
						className="max-w-[820px] text-[30px] text-muted-foreground leading-relaxed"
						style={enter(lines, { rise: 18, blur: 6 })}
					>
						You get an answer in seconds, and lose it by morning. Speed was
						never the hard part. Understanding was.
					</p>
				</div>
			</AbsoluteFill>
		</Stage>
	);
}
