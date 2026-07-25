import { Easing, interpolate } from "remotion";

/** The product's motion tokens (index.css `--ease-*`), re-expressed as
 * Remotion easings so on-screen movement matches the app's feel exactly. */
export const easeSnappy = Easing.bezier(0.23, 1, 0.32, 1);
export const easeFluid = Easing.bezier(0.77, 0, 0.175, 1);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0 → 1 over `[start, start + duration]`, snappy by default. */
export const ramp = (
	frame: number,
	start: number,
	duration: number,
	easing = easeSnappy,
): number =>
	interpolate(frame, [start, start + duration], [0, 1], { easing, ...clamp });

/** 1 while inside the window, ramping in and back out at the edges. */
export const window_ = (
	frame: number,
	start: number,
	end: number,
	fade: number,
): number =>
	interpolate(frame, [start, start + fade, end - fade, end], [0, 1, 1, 0], {
		easing: easeSnappy,
		...clamp,
	});

/** The house entrance: rise, fade, and de-blur together. Mirrors the app's
 * `tool-in` / Streamdown `blurIn` feel (8px rise, 4px blur, ease-out). */
export const enter = (
	progress: number,
	{
		rise = 26,
		blur = 8,
		from = 1,
	}: { rise?: number; blur?: number; from?: number } = {},
): React.CSSProperties => ({
	opacity: progress,
	filter: `blur(${(1 - progress) * blur}px)`,
	transform: `translateY(${(1 - progress) * rise}px) scale(${
		from + (1 - from) * progress
	})`,
});

/** Stagger helper: the nth item of a list, offset by `step` frames. */
export const stagger = (index: number, step: number): number => index * step;
