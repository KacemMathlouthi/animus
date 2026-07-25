import { interpolate, useCurrentFrame } from "remotion";
import { easeSnappy, ramp } from "@/lib/motion";
import { sec } from "@/lib/timing";

/** The rendered explainer itself: a Fourier series building a square wave.
 *
 * This is the film's proof, so it is not a mock. The geometry is computed the
 * way the maths actually works: odd harmonics only, amplitude 4/(πk), angular
 * speed k, chained tip to tail. The tip of the chain draws the curve, and the
 * curve is sampled backwards through time so it scrolls out to the right
 * exactly as the epicycles turn. Harmonics arrive one at a time, so the
 * audience watches a wobble become a square wave.
 *
 * Palette and proportions follow the product: true black canvas, warm sand for
 * the result, white at low alpha for the scaffolding. */

const HARMONICS = [1, 3, 5, 7, 9, 11];
/** Seconds between each new harmonic joining the chain. */
const HARMONIC_EVERY = 1.15;
const START = sec(0.35);
/** Radians per second of the fundamental. */
const OMEGA = 1.25;

type Point = { x: number; y: number };

/** Tip of the epicycle chain at time `t`, using `count` harmonics. */
function chain(
	t: number,
	count: number,
	unit: number,
	partial: number,
): Point[] {
	const points: Point[] = [{ x: 0, y: 0 }];
	let x = 0;
	let y = 0;

	for (let index = 0; index < count; index++) {
		const k = HARMONICS[index];
		// The newest harmonic grows in rather than popping into existence.
		const weight = index === count - 1 ? partial : 1;
		const radius = ((4 / Math.PI) * unit * weight) / k;
		const angle = k * OMEGA * t;
		x += radius * Math.cos(angle);
		y += radius * Math.sin(angle);
		points.push({ x, y });
	}

	return points;
}

export function FourierScene({
	width,
	height,
	startFrame = 0,
}: {
	width: number;
	height: number;
	/** Frame the animation begins on, in the enclosing sequence's timeline. */
	startFrame?: number;
}): React.JSX.Element {
	const frame = useCurrentFrame() - startFrame;
	const t = Math.max(0, (frame - START) / 60);

	const originX = width * 0.26;
	const originY = height * 0.52;
	const unit = Math.min(height * 0.19, width * 0.1);
	const waveX = originX + unit * 1.75;
	const waveWidth = width - waveX - width * 0.06;

	// How many harmonics are in play, and how far the newest one has grown.
	const elapsedHarmonics = t / HARMONIC_EVERY;
	const count = Math.min(HARMONICS.length, Math.floor(elapsedHarmonics) + 1);
	const partial =
		count === HARMONICS.length && elapsedHarmonics >= HARMONICS.length - 1
			? 1
			: interpolate(elapsedHarmonics % 1, [0, 0.55], [0, 1], {
					easing: easeSnappy,
					extrapolateRight: "clamp",
				});

	const circles = chain(t, count, unit, partial);
	const tip = circles[circles.length - 1];

	// The curve trails the tip: each pixel to the right is the tip's height a
	// little further back in time, so it unrolls rightwards as the chain turns.
	// 1.3 fundamental periods fill the panel, which happens a few seconds in.
	const secondsShown = (1.3 * (2 * Math.PI)) / OMEGA;
	const samples = 200;
	const path: string[] = [];
	for (let index = 0; index <= samples; index++) {
		const back = (index / samples) * secondsShown;
		// Nothing is drawn for time that has not happened yet.
		if (back > t) {
			break;
		}
		const y = chain(t - back, count, unit, partial)[count].y;
		const x = waveX + (index / samples) * waveWidth;
		path.push(
			`${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${(originY + y).toFixed(2)}`,
		);
	}

	const axes = ramp(frame, 0, sec(0.8));
	const label = ramp(frame, sec(0.5), sec(0.6));

	return (
		<svg
			className="film-manim block"
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			width={width}
		>
			<title>A Fourier series converging to a square wave</title>

			{/* Axis through the wave, drawn on before anything moves. */}
			<line
				stroke="rgba(255,255,255,0.16)"
				strokeWidth={1}
				x1={waveX}
				x2={waveX + waveWidth * axes}
				y1={originY}
				y2={originY}
			/>

			{/* The square wave the series is converging to: the target, ghosted. */}
			<path
				d={squarePath(
					waveX,
					waveWidth,
					originY,
					unit * (4 / Math.PI),
					secondsShown,
					t,
				)}
				fill="none"
				opacity={0.22 * ramp(frame, sec(1.6), sec(1))}
				stroke="rgba(255,255,255,0.9)"
				strokeDasharray="4 6"
				strokeWidth={1.5}
			/>

			{/* The epicycles. */}
			<g opacity={axes}>
				{circles.slice(0, -1).map((point, index) => {
					const k = HARMONICS[index];
					const weight = index === count - 1 ? partial : 1;
					const radius = ((4 / Math.PI) * unit * weight) / k;
					const next = circles[index + 1];

					return (
						<g key={k}>
							<circle
								cx={originX + point.x}
								cy={originY + point.y}
								fill="none"
								r={radius}
								stroke="rgba(255,255,255,0.22)"
								strokeWidth={1}
							/>
							<line
								stroke="rgba(255,255,255,0.55)"
								strokeWidth={1.25}
								x1={originX + point.x}
								x2={originX + next.x}
								y1={originY + point.y}
								y2={originY + next.y}
							/>
						</g>
					);
				})}
			</g>

			{/* The connector from the tip to where the curve starts. */}
			<line
				opacity={0.45 * axes}
				stroke="var(--primary)"
				strokeDasharray="3 4"
				strokeWidth={1}
				x1={originX + tip.x}
				x2={waveX}
				y1={originY + tip.y}
				y2={originY + tip.y}
			/>

			{/* The result. */}
			<path
				d={path.join(" ")}
				fill="none"
				opacity={axes}
				stroke="var(--primary)"
				strokeLinecap="round"
				strokeWidth={2.5}
				style={{
					filter:
						"drop-shadow(0 0 6px color-mix(in srgb, var(--primary) 55%, transparent))",
				}}
			/>

			{/* The drawing tip. */}
			<circle
				cx={originX + tip.x}
				cy={originY + tip.y}
				fill="var(--primary)"
				opacity={axes}
				r={4}
			/>

			{/* The series, growing a term each time a harmonic joins. */}
			<text
				fill="rgba(255,255,255,0.82)"
				fontFamily="ui-serif, Georgia, 'Times New Roman', serif"
				fontSize={height * 0.043}
				fontStyle="italic"
				opacity={label}
				x={width * 0.055}
				y={height * 0.115}
			>
				{series(count)}
			</text>
		</svg>
	);
}

/** The partial-sum expression, one term per active harmonic. */
function series(count: number): string {
	const terms = HARMONICS.slice(0, count).map((k) =>
		k === 1 ? "sin t" : `sin ${k}t / ${k}`,
	);
	return `f(t) = 4/π ( ${terms.join(" + ")}${count < HARMONICS.length ? " + …" : ""} )`;
}

/** The ideal square wave, sampled over the same window as the curve. */
function squarePath(
	x0: number,
	width: number,
	y0: number,
	amplitude: number,
	secondsShown: number,
	t: number,
): string {
	const samples = 260;
	const points: string[] = [];
	for (let index = 0; index <= samples; index++) {
		const back = (index / samples) * secondsShown;
		if (back > t) {
			break;
		}
		const value = Math.sin(OMEGA * (t - back)) >= 0 ? 1 : -1;
		const y = y0 + (value * amplitude * Math.PI) / 4;
		points.push(
			`${index === 0 ? "M" : "L"} ${(x0 + (index / samples) * width).toFixed(2)} ${y.toFixed(2)}`,
		);
	}
	return points.join(" ");
}
