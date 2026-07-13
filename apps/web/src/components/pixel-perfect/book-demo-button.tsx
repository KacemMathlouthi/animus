import { Link } from "react-router";
import { cn } from "@/lib/utils";

/* Adapted from pixel-perfect's book-demo button: the sliding pill picks up the
   brand primary token (warm loam in light, warm sand in dark) instead of the
   registry's fixed variants, and the dot-wave keyframes live in index.css. */

const chevronDots = [
	{ id: "d1", cx: 2, cy: 2, delay: 0 },
	{ id: "d2", cx: 5, cy: 5, delay: 0.05 },
	{ id: "d3", cx: 8, cy: 8, delay: 0.1 },
	{ id: "d4", cx: 5, cy: 11, delay: 0.15 },
	{ id: "d5", cx: 2, cy: 14, delay: 0.2 },
	{ id: "d6", cx: 6, cy: 2, delay: 0.05 },
	{ id: "d7", cx: 9, cy: 5, delay: 0.1 },
	{ id: "d8", cx: 12, cy: 8, delay: 0.15 },
	{ id: "d9", cx: 9, cy: 11, delay: 0.2 },
	{ id: "d10", cx: 6, cy: 14, delay: 0.25 },
];

/* Enough chevrons to fill the pill at any reasonable button width; the pill
   clips the overflow (overflow-hidden), so extras are harmless. */
const chevronIds = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"] as const;

function DoubleChevron({ index }: { index: number }) {
	const base = index * 0.12;

	return (
		<svg
			aria-hidden="true"
			className="shrink-0 overflow-visible"
			height="16"
			viewBox="0 0 14 16"
			width="14"
		>
			<g fill="var(--primary-foreground)">
				{chevronDots.map((dot) => (
					<circle
						className="bd-dot"
						cx={dot.cx}
						cy={dot.cy}
						key={dot.id}
						r="1"
						style={{ animationDelay: `${base + dot.delay}s` }}
					/>
				))}
			</g>
		</svg>
	);
}

const rootClasses = cn(
	"group/btn bd-root relative inline-flex h-11 w-36 overflow-hidden rounded-[12px]",
	"bg-gradient-to-b from-[#1f1f1f] to-[#0a0a0a] dark:from-[#2c2c2c] dark:to-[#161616]",
	"shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.18)]",
	"transition-transform active:scale-[0.97]",
	"focus-visible:outline-2 focus-visible:outline-offset-2",
);

function ButtonBody({
	children,
}: {
	children: React.ReactNode;
}): React.JSX.Element {
	return (
		<>
			<span
				className={cn(
					"absolute inset-y-0 right-4 flex items-center font-medium text-[14px] text-white tracking-tight",
					"transition-[transform,opacity] duration-200 ease-snappy motion-reduce:transition-none",
					"group-hover/btn:translate-x-2 group-hover/btn:opacity-0",
					"group-focus-visible/btn:translate-x-2 group-focus-visible/btn:opacity-0",
				)}
			>
				{children}
			</span>

			<span
				className={cn(
					"absolute top-1 bottom-1 left-1 z-10 flex w-9 items-center justify-start gap-2.5 overflow-hidden rounded-md pr-2.5 pl-3",
					"transition-[width,gap] duration-[260ms] ease-snappy motion-reduce:transition-none",
					"group-hover/btn:w-[calc(100%-0.5rem)] group-focus-visible/btn:w-[calc(100%-0.5rem)] group-active/btn:w-[calc(100%-0.5rem)]",
				)}
				style={{
					background:
						"linear-gradient(180deg, color-mix(in srgb, var(--primary) 85%, white) 0%, var(--primary) 100%)",
					boxShadow:
						"inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)",
				}}
			>
				{chevronIds.map((id, index) => (
					<DoubleChevron index={index} key={id} />
				))}
			</span>
		</>
	);
}

/** With `to`, renders a real router link (middle-click, link role, crawlable);
 * without it, a plain button for onClick use. */
export function BookDemoButton({
	className,
	children,
	to,
	...props
}: React.ComponentProps<"button"> & { to?: string }): React.JSX.Element {
	if (to) {
		return (
			<Link className={cn(rootClasses, className)} to={to}>
				<ButtonBody>{children}</ButtonBody>
			</Link>
		);
	}
	return (
		<button className={cn(rootClasses, className)} type="button" {...props}>
			<ButtonBody>{children}</ButtonBody>
		</button>
	);
}
