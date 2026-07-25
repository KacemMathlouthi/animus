import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Stage } from "@/components/chrome";
import { Typewriter } from "@/components/type";
import { easeFluid, easeSnappy, ramp } from "@/lib/motion";
import { sec } from "@/lib/timing";
import { cn } from "@/lib/utils";

/** Beat 01a. The problem, shown rather than stated.
 *
 * A deliberately generic chat: no brand, no colour, no warmth. A question goes
 * in, a wall of confident grey text floods out, and then the whole thing
 * evaporates upward and leaves nothing behind. Everything on screen is cold so
 * that the cut to animus lands as a temperature change, not just a scene
 * change. */

const QUESTION = "explain the fourier transform";

/** Plausible-sounding filler. The words are never legible for long enough to
 * read; what registers is the volume of it, and then the absence. */
const ANSWER: { id: string; width: string; dim?: boolean }[] = [
	{ id: "p1-l1", width: "96%" },
	{ id: "p1-l2", width: "88%" },
	{ id: "p1-l3", width: "93%" },
	{ id: "p1-l4", width: "71%" },
	{ id: "gap-1", width: "0%" },
	{ id: "p2-l1", width: "90%", dim: true },
	{ id: "p2-l2", width: "96%", dim: true },
	{ id: "p2-l3", width: "84%", dim: true },
	{ id: "p2-l4", width: "89%", dim: true },
	{ id: "p2-l5", width: "62%", dim: true },
	{ id: "gap-2", width: "0%" },
	{ id: "p3-l1", width: "94%", dim: true },
	{ id: "p3-l2", width: "78%", dim: true },
];

const TYPE_START = sec(0.5);
const ANSWER_START = sec(2.6);
const DISSOLVE_START = sec(5.2);

export function ColdOpen(): React.JSX.Element {
	const frame = useCurrentFrame();

	// The answer drains away: it lifts, blurs, and desaturates to nothing.
	const dissolve = ramp(frame, DISSOLVE_START, sec(2), easeFluid);
	const drain = {
		opacity: 1 - dissolve,
		filter: `blur(${dissolve * 14}px)`,
		transform: `translateY(${dissolve * -70}px)`,
	};

	return (
		<Stage className="items-center justify-center" grain={false}>
			{/* No brand bloom in this scene: the canvas is a flat, cold black. */}
			<AbsoluteFill style={{ background: "#08080a" }} />

			<AbsoluteFill className="items-center justify-center px-40">
				<div className="w-full max-w-[1180px]">
					{/* The question, typed into a nondescript field. */}
					<div
						className="flex items-baseline gap-4 border-white/[0.07] border-b pb-7 text-[34px] text-white/70"
						style={{ opacity: 1 - dissolve * 0.85 }}
					>
						<span className="font-mono text-white/25 text-[24px]">&gt;</span>
						<Typewriter
							caretAfterDone={false}
							className="tracking-tight"
							cps={22}
							start={TYPE_START}
							text={QUESTION}
						/>
					</div>

					{/* The flood. Lines arrive fast and overlapping, the way a stream of
              tokens actually reads: too quick to hold on to. */}
					<div className="mt-12 space-y-[22px]" style={drain}>
						{ANSWER.map((line, index) => {
							if (line.width === "0%") {
								return <div className="h-3" key={line.id} />;
							}
							const appear = ramp(
								frame,
								ANSWER_START + index * 4.5,
								14,
								easeSnappy,
							);

							return (
								<div
									className={cn(
										"h-[18px] rounded-full",
										line.dim ? "bg-white/[0.11]" : "bg-white/[0.2]",
									)}
									key={line.id}
									style={{
										width: line.width,
										opacity: appear,
										// Wipe in from the left, like text filling a line.
										clipPath: `inset(0 ${(1 - appear) * 100}% 0 0)`,
									}}
								/>
							);
						})}
					</div>
				</div>
			</AbsoluteFill>

			{/* After the drain: a beat of nothing, which is the point. */}
			<AbsoluteFill
				className="items-center justify-center"
				style={{
					opacity: interpolate(
						frame,
						[DISSOLVE_START + sec(1.4), DISSOLVE_START + sec(2.1)],
						[0, 1],
						{
							easing: easeSnappy,
							extrapolateLeft: "clamp",
							extrapolateRight: "clamp",
						},
					),
				}}
			>
				<p className="font-mono text-[22px] text-white/20 uppercase tracking-[0.4em]">
					gone
				</p>
			</AbsoluteFill>
		</Stage>
	);
}
