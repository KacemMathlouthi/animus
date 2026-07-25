import { useId } from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { cn } from "@/lib/utils";

/** The animus mark, geometry copied verbatim from
 * `apps/web/src/components/brand/logo-mark.tsx`.
 *
 * The app animates it with CSS keyframes on a wall clock; a renderer that
 * samples frames out of order would capture that at arbitrary phases, so the
 * same three motions (float + squash, eye scan, blink) are re-driven from the
 * frame number here. The timings match index.css: one 2.8s cycle, two blinks
 * per cycle, eyes darting left then right. */

const CYCLE_SECONDS = 2.8;

type LogoMarkProps = {
	className?: string;
	/** "loading" runs the pondering loop; "still" is the static mark. */
	animate?: "still" | "loading";
	/** Shifts the loop so several marks are not in lockstep. */
	phase?: number;
};

export function LogoMark({
	className,
	animate = "still",
	phase = 0,
}: LogoMarkProps): React.JSX.Element {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const id = useId();
	const bodyId = `${id}-body`;
	const eyeId = `${id}-eye`;

	const running = animate === "loading";
	// Normalised position in the loop, 0 → 1.
	const cycle = running
		? (((frame / fps + phase) % CYCLE_SECONDS) / CYCLE_SECONDS) * 100
		: 0;

	const at = (
		points: number[],
		values: number[],
		easing = Easing.inOut(Easing.ease),
	) =>
		interpolate(cycle, points, values, {
			easing,
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		});

	// logo-float: a light bob with a pondering tilt.
	const floatY = running ? at([0, 50, 100], [0, -4, 0]) : 0;
	const tilt = running ? at([0, 50, 100], [-1.5, 1.5, -1.5]) : 0;
	// logo-squash: jelly, squished at the bottom of the bob.
	const squashX = running ? at([0, 50, 100], [1.035, 0.99, 1.035]) : 1;
	const squashY = running ? at([0, 50, 100], [0.965, 1.025, 0.965]) : 1;
	// logo-scan: eyes dart up-and-left, hold, dart right, return.
	const scanEase = Easing.bezier(0.6, 0, 0.2, 1);
	const eyeX = running
		? at([0, 10, 18, 40, 48, 72, 80, 100], [0, 0, -3, -3, 3, 3, 0, 0], scanEase)
		: 0;
	const eyeY = running
		? at(
				[0, 10, 18, 40, 48, 72, 80, 100],
				[0, 0, -2, -2, -2.5, -2.5, 0, 0],
				scanEase,
			)
		: 0;
	// logo-blink-loop: two crisp blinks timed to land as the gaze changes.
	const blink = running
		? at([0, 12, 15, 19, 45, 48, 52, 100], [1, 1, 0.08, 1, 1, 0.08, 1, 1])
		: 1;

	const shadowBlur = running ? at([0, 50, 100], [4, 6, 4]) : 0;
	const shadowY = running ? at([0, 50, 100], [5, 9, 5]) : 0;
	const shadowAlpha = running ? at([0, 50, 100], [0.18, 0.12, 0.18]) : 0;

	return (
		<svg
			className={cn("overflow-visible", className)}
			fill="none"
			role="img"
			viewBox="25 19 70 93"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>animus</title>
			<defs>
				<linearGradient id={bodyId} x1="0" x2="0" y1="0" y2="1">
					<stop offset="0" stopColor="#e7b277" />
					<stop offset="1" stopColor="#7a4717" />
				</linearGradient>
				<linearGradient id={eyeId} x1="0" x2="0" y1="0" y2="1">
					<stop offset="0" stopColor="#0b0a0a" />
					<stop offset="1" stopColor="#5f5a55" />
				</linearGradient>
			</defs>

			<g
				style={{
					transformBox: "fill-box",
					transformOrigin: "center",
					transform: `translateY(${floatY}px) rotate(${tilt}deg)`,
					filter: running
						? `drop-shadow(0 ${shadowY}px ${shadowBlur}px rgb(0 0 0 / ${shadowAlpha}))`
						: undefined,
				}}
			>
				<path
					d="M28 64 C28 38 42 22 60 22 C78 22 92 38 92 64 L92 104 C92 111 80 111 76 104 Q68 114 60 104 Q52 114 44 104 C40 111 28 111 28 104 Z"
					fill={`url(#${bodyId})`}
					style={{
						transformBox: "fill-box",
						transformOrigin: "center bottom",
						transform: `scale(${squashX}, ${squashY})`,
					}}
				/>
				<g style={{ transform: `translate(${eyeX}px, ${eyeY}px)` }}>
					<g
						style={{
							transformBox: "fill-box",
							transformOrigin: "center",
							transform: `scaleY(${blink})`,
						}}
					>
						<g
							fill={`url(#${eyeId})`}
							transform="translate(5.2 -11.2) scale(0.6)"
						>
							<path d="m74.6 97.4h0.2c3.2 0 5.6 2.6 5.6 5.8l0.1 17.9c-0.1 3.1-2.4 5.9-5.9 6-2.9-0.1-5.7-2.1-5.7-6.2v-17.9c0-3.1 2.5-5.6 5.7-5.6z" />
							<path d="m105.4 97.4h0.1c3 0 5.7 2.5 5.7 5.8v17.8c0 3-2.5 6.1-6 6.1-2.8-0.1-5.7-2.3-5.8-6.1v-18c0.2-3.1 2.6-5.6 6-5.6z" />
						</g>
					</g>
				</g>
			</g>
		</svg>
	);
}
