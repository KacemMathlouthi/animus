import {
	AudioLinesIcon,
	BoxIcon,
	RefreshCwIcon,
	SearchIcon,
	SigmaIcon,
	SquareStackIcon,
} from "lucide-react";
import type React from "react";
import { DecorIcon } from "@/components/decor-icon";
import { cn } from "@/lib/utils";

type FeatureType = {
	title: string;
	icon: React.ReactNode;
	description: string;
};

export function FeatureSection() {
	return (
		<div
			className="mx-auto flex w-full max-w-5xl flex-col justify-center gap-12 px-4 py-20 md:px-8 md:py-28"
			id="features"
		>
			<div className="space-y-3 text-center">
				<h2 className="font-medium text-3xl tracking-tight md:text-5xl">
					Everything it takes to make it click
				</h2>
				<p className="mx-auto max-w-2xl text-muted-foreground leading-relaxed md:text-lg">
					animus handles the research, the storyboard, the math, and the voice,
					so a finished video is the default, not the destination.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
				{features.map((feature) => (
					<FeatureCard feature={feature} key={feature.title} />
				))}
			</div>
		</div>
	);
}

function FeatureCard({
	feature,
	className,
	...props
}: React.ComponentProps<"div"> & {
	feature: FeatureType;
}) {
	return (
		<div
			className={cn(
				"relative flex flex-col justify-between gap-6 bg-background px-6 pt-8 pb-6 shadow-xs",
				"dark:bg-[radial-gradient(50%_80%_at_25%_0%,theme(--color-foreground/.08),transparent)]",
				className,
			)}
			{...props}
		>
			<div className="absolute -inset-y-4 -left-px w-px bg-border" />
			<div className="absolute -inset-y-4 -right-px w-px bg-border" />
			<div className="absolute -inset-x-4 -top-px h-px bg-border" />
			<div className="absolute -right-4 -bottom-px -left-4 h-px bg-border" />

			<DecorIcon className="size-3.5" position="top-left" />

			<div
				className={cn(
					"relative z-10 flex w-fit items-center justify-center rounded-lg border bg-muted/40 p-3",
					"[&_svg]:size-5 [&_svg]:stroke-[1.5] [&_svg]:text-foreground",
				)}
			>
				{feature.icon}
			</div>

			<div className="relative z-10 space-y-2">
				<h3 className="font-medium text-base text-foreground">
					{feature.title}
				</h3>
				<p className="text-muted-foreground text-sm leading-relaxed">
					{feature.description}
				</p>
			</div>
		</div>
	);
}

const features: FeatureType[] = [
	{
		title: "Research-grounded",
		icon: <SearchIcon />,
		description:
			"Every explainer starts from real sources, so the narration stays accurate instead of plausible.",
	},
	{
		title: "Storyboarded scenes",
		icon: <SquareStackIcon />,
		description:
			"animus plans the full arc scene by scene before a single frame is drawn, so you can edit it first.",
	},
	{
		title: "Real narration",
		icon: <AudioLinesIcon />,
		description:
			"Studio-grade voiceover is written and timed to the motion, not bolted on afterwards.",
	},
	{
		title: "Mathematically precise",
		icon: <SigmaIcon />,
		description:
			"Built on Manim, so equations, graphs, and transforms are exact, never hand-waved approximations.",
	},
	{
		title: "Self-correcting",
		icon: <RefreshCwIcon />,
		description:
			"It watches its own renders, catches layout and timing slips, and repairs the scene on its own.",
	},
	{
		title: "Sandboxed renders",
		icon: <BoxIcon />,
		description:
			"Each video builds in an isolated sandbox, so runs are reproducible and never touch your machine.",
	},
];
