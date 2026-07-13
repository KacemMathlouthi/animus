/** A thin circular progress ring wrapping its children (e.g. the profile
 * avatar). `value` is 0–1 of the ring filled; it turns amber when the balance
 * runs low so the header quietly signals "almost out". */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const LOW_THRESHOLD = 0.15;

export function CreditGauge({
	value,
	size = 38,
	strokeWidth = 2.5,
	className,
	children,
}: {
	value: number;
	size?: number;
	strokeWidth?: number;
	className?: string;
	children: ReactNode;
}) {
	const clamped = Math.max(0, Math.min(1, value));
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference * (1 - clamped);
	const low = clamped <= LOW_THRESHOLD;

	return (
		<span
			className={cn(
				"relative inline-flex items-center justify-center",
				className,
			)}
			style={{ width: size, height: size }}
		>
			<svg
				aria-hidden="true"
				className="-rotate-90 absolute inset-0"
				fill="none"
				height={size}
				viewBox={`0 0 ${size} ${size}`}
				width={size}
			>
				<circle
					className="stroke-muted"
					cx={size / 2}
					cy={size / 2}
					r={radius}
					strokeWidth={strokeWidth}
				/>
				<circle
					className={cn(
						"transition-[stroke-dashoffset] duration-500 ease-out",
						low ? "stroke-amber-500" : "stroke-primary",
					)}
					cx={size / 2}
					cy={size / 2}
					r={radius}
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					strokeLinecap="round"
					strokeWidth={strokeWidth}
				/>
			</svg>
			<span className="flex items-center justify-center">{children}</span>
		</span>
	);
}
