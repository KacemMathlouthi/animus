import {
	AbsoluteFill,
	Img,
	interpolate,
	staticFile,
	useCurrentFrame,
} from "remotion";
import { EdgeLines, Stage } from "@/components/chrome";
import { LogoMark } from "@/components/logo-mark";
import { Headline, WordsIn } from "@/components/type";
import { easeFluid, easeSnappy, enter, ramp } from "@/lib/motion";
import { sec } from "@/lib/timing";

/** Beat 04b. The ask.
 *
 * The one sentence the whole film exists to leave behind, held long enough to
 * be read twice, then handed off to the mark, the domain and a single
 * instruction. Nothing else appears on this card. */

const SENTENCE =
	"Next time you're curious, don't settle for an answer you'll *forget* by morning.";

const MASK =
	"linear-gradient(to top, transparent 0%, black 14%, black 45%, transparent 92%)";

const HANDOFF = sec(3.6);

export function TheAsk(): React.JSX.Element {
	const frame = useCurrentFrame();

	const sentenceOut = ramp(frame, HANDOFF, sec(0.8), easeFluid);
	const lockup = ramp(frame, HANDOFF + sec(0.35), sec(1), easeSnappy);
	const domain = ramp(frame, HANDOFF + sec(0.9), sec(0.7));
	const cta = ramp(frame, HANDOFF + sec(1.3), sec(0.7));
	const art = ramp(frame, HANDOFF, sec(2), easeFluid);

	return (
		<Stage grain={false}>
			{/* The hero artwork returns for the close, bookending the brand turn. */}
			<AbsoluteFill style={{ opacity: art * 0.85 }}>
				<Img
					className="absolute bottom-0 left-0 w-full"
					src={staticFile("hero/hero-dark.webp")}
					style={{
						maskImage: MASK,
						WebkitMaskImage: MASK,
						transform: `scale(${interpolate(art, [0, 1], [1.08, 1])})`,
						transformOrigin: "bottom center",
					}}
				/>
				{/* The artwork is busy where the lockup sits, so it is pushed back far
            enough for the type to stay the brightest thing in frame. */}
				<AbsoluteFill className="bg-background/55" />
				<AbsoluteFill
					style={{
						background:
							"radial-gradient(ellipse 46% 40% at 50% 46%, var(--background) 25%, transparent 75%)",
					}}
				/>
			</AbsoluteFill>

			<EdgeLines opacity={0.85} />

			{/* The sentence. */}
			<AbsoluteFill className="items-center justify-center px-48">
				<Headline
					className="max-w-[1620px] text-center text-[76px] leading-[1.18]"
					style={{
						opacity: 1 - sentenceOut,
						filter: `blur(${sentenceOut * 12}px)`,
						transform: `translateY(${sentenceOut * -50}px) scale(${1 - sentenceOut * 0.03})`,
					}}
				>
					<WordsIn
						duration={sec(0.6)}
						start={sec(0.3)}
						step={3.4}
						text={SENTENCE}
					/>
				</Headline>
			</AbsoluteFill>

			{/* The handoff: mark, domain, instruction. */}
			<AbsoluteFill className="items-center justify-center">
				<div className="flex flex-col items-center gap-10">
					<div
						className="flex items-center gap-6"
						style={{
							opacity: lockup,
							filter: `blur(${(1 - lockup) * 14}px)`,
							transform: `scale(${interpolate(lockup, [0, 1], [0.82, 1])})`,
						}}
					>
						<LogoMark animate="loading" className="h-[150px] w-auto" />
						<span className="font-medium text-[82px] text-foreground tracking-[-0.02em]">
							animus
						</span>
					</div>

					<p
						className="font-mono text-[34px] text-primary tracking-[0.16em]"
						style={enter(domain, { rise: 16, blur: 6 })}
					>
						tryanimus.app
					</p>

					<p
						className="text-[30px] text-muted-foreground"
						style={enter(cta, { rise: 14, blur: 5 })}
					>
						Ask your first question.
					</p>
				</div>
			</AbsoluteFill>
		</Stage>
	);
}
