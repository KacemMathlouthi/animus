import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { cn } from "@/lib/utils";

/** Shared set dressing: the surfaces and marks that make every cut read as the
 * same product. All of it is lifted from the landing page's own chrome. */

/** The landing hero's four vertical hairlines near the page edges. */
export function EdgeLines({
	opacity = 1,
}: {
	opacity?: number;
}): React.JSX.Element {
	return (
		<AbsoluteFill aria-hidden style={{ opacity }}>
			<div className="absolute inset-y-0 left-10 w-px bg-linear-to-b from-transparent via-border to-border" />
			<div className="absolute inset-y-0 right-10 w-px bg-linear-to-b from-transparent via-border to-border" />
			<div className="absolute inset-y-0 left-20 w-px bg-linear-to-b from-transparent via-border/50 to-border/50" />
			<div className="absolute inset-y-0 right-20 w-px bg-linear-to-b from-transparent via-border/50 to-border/50" />
		</AbsoluteFill>
	);
}

/** The corner cross the landing page marks its sections with
 * (`components/decor-icon.tsx`). */
function DecorCross({
	className,
	size = 18,
}: {
	className?: string;
	size?: number;
}): React.JSX.Element {
	return (
		<svg
			aria-hidden="true"
			className={cn("absolute text-muted-foreground/45", className)}
			role="presentation"
			fill="none"
			height={size}
			stroke="currentColor"
			strokeWidth={1}
			viewBox="0 0 24 24"
			width={size}
		>
			<path d="M12 3v18M3 12h18" />
		</svg>
	);
}

/** The four corner crosses framing a region, as on every landing section. */
export function CornerFrame({
	size = 18,
}: {
	size?: number;
}): React.JSX.Element {
	return (
		<>
			<DecorCross
				className="-translate-x-1/2 -translate-y-1/2 top-0 left-0"
				size={size}
			/>
			<DecorCross
				className="-translate-y-1/2 top-0 right-0 translate-x-1/2"
				size={size}
			/>
			<DecorCross
				className="-translate-x-1/2 bottom-0 left-0 translate-y-1/2"
				size={size}
			/>
			<DecorCross
				className="right-0 bottom-0 translate-x-1/2 translate-y-1/2"
				size={size}
			/>
		</>
	);
}

/** Cinema pass: a soft vignette plus animated grain, so flat dark panels get
 * some texture and gradients stop banding on compression. */
function FilmGrain({
	intensity = 0.05,
}: {
	intensity?: number;
}): React.JSX.Element {
	const frame = useCurrentFrame();
	// Re-seeding the turbulence every other frame gives moving grain without a
	// video texture; the tile is small and cheap to rasterise.
	const seed = Math.floor(frame / 2) % 12;

	return (
		<AbsoluteFill aria-hidden className="pointer-events-none">
			<AbsoluteFill
				style={{
					background:
						"radial-gradient(ellipse 75% 65% at 50% 45%, transparent 40%, rgba(0,0,0,0.55) 100%)",
					mixBlendMode: "multiply",
				}}
			/>
			<svg
				aria-hidden="true"
				className="absolute inset-0 h-full w-full"
				role="presentation"
				style={{ opacity: intensity }}
			>
				<filter id={`grain-${seed}`}>
					<feTurbulence
						baseFrequency="0.85"
						numOctaves={2}
						seed={seed}
						type="fractalNoise"
					/>
					<feColorMatrix type="saturate" values="0" />
				</filter>
				<rect filter={`url(#grain-${seed})`} height="100%" width="100%" />
			</svg>
		</AbsoluteFill>
	);
}

/** The dark stage every scene is built on. */
export function Stage({
	children,
	className,
	grain = true,
}: {
	children?: React.ReactNode;
	className?: string;
	grain?: boolean;
}): React.JSX.Element {
	return (
		// `dark` selects the app's dark token set; `text-foreground` stands in for
		// the `body` rule the app relies on, which Remotion's container has not.
		<AbsoluteFill className={cn("film-canvas dark text-foreground", className)}>
			{children}
			{grain ? <FilmGrain /> : null}
		</AbsoluteFill>
	);
}
