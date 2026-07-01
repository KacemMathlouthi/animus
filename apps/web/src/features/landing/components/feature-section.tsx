import {
	AudioLinesIcon,
	SearchIcon,
	Share2Icon,
	SigmaIcon,
} from "lucide-react";
import type React from "react";
import { DecorIcon } from "@/components/decor-icon";
import { FullWidthDivider } from "@/features/landing/components/full-width-divider";
import { cn } from "@/lib/utils";

export function FeatureSection() {
	return (
		<div
			className="relative flex min-h-svh scroll-mt-20 flex-col items-center justify-center gap-10 px-4 py-20"
			id="features"
		>
			<DecorIcon className="size-4" position="top-left" />
			<DecorIcon className="size-4" position="top-right" />
			<DecorIcon className="size-4" position="bottom-left" />
			<DecorIcon className="size-4" position="bottom-right" />

			<FullWidthDivider className="-top-px" />

			<div className="space-y-3 text-center">
				<p className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
					Why animus
				</p>
				<h2 className="font-medium text-3xl text-foreground tracking-tight md:text-5xl">
					Everything it takes to make it click
				</h2>
				<p className="mx-auto max-w-2xl text-muted-foreground leading-relaxed md:text-lg">
					animus handles the research, the storyboard, the math, and the voice,
					so a finished video is the default, not the destination.
				</p>
			</div>

			<div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2">
				<FeatureCard className="h-80 p-0 md:h-96">
					<PaintingCard
						alt="Raphael, The School of Athens"
						description="Every explainer starts from real sources, so the narration stays accurate instead of plausible."
						icon={<SearchIcon className="size-4" />}
						image="/features/research-grounded.webp"
						objectPosition="50% 38%"
						title="Research-grounded"
					/>
				</FeatureCard>

				<FeatureCard className="h-80 p-0 md:h-96">
					<PaintingCard
						alt="Caravaggio, The Lute Player"
						description="Studio-grade voiceover is written and timed to the motion, not bolted on afterwards."
						icon={<AudioLinesIcon className="size-4" />}
						image="/features/narration.webp"
						objectPosition="50% 40%"
						title="Real narration"
					/>
				</FeatureCard>

				<FeatureCard className="h-80 p-0 md:h-96">
					<PaintingCard
						alt="Leonardo da Vinci, Vitruvian Man"
						description="Equations, graphs, and transforms are drawn exactly, so the visuals are accurate, never rough approximations."
						icon={<SigmaIcon className="size-4" />}
						image="/features/precision.webp"
						objectPosition="50% 30%"
						title="Precise, not hand-wavy"
					/>
				</FeatureCard>

				<FeatureCard className="h-80 p-0 md:h-96">
					<PaintingCard
						alt="Claude Lorrain, Seaport with the Embarkation of the Queen of Sheba"
						description="Every explainer comes back as a polished video you can download, post, or send in a click."
						icon={<Share2Icon className="size-4" />}
						image="/features/share.webp"
						objectPosition="50% 55%"
						title="Ready to share"
					/>
				</FeatureCard>
			</div>

			<FullWidthDivider className="-bottom-px" />
		</div>
	);
}

function FeatureCard({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"relative flex flex-col justify-between gap-6 bg-background px-6 pt-8 pb-6 shadow-xs",
				"dark:bg-[radial-gradient(50%_80%_at_25%_0%,theme(--color-foreground/.08),transparent)]",
				className,
			)}
		>
			<div className="absolute -inset-y-4 -left-px w-px bg-border" />
			<div className="absolute -inset-y-4 -right-px w-px bg-border" />
			<div className="absolute -inset-x-4 -top-px h-px bg-border" />
			<div className="absolute -right-4 -bottom-px -left-4 h-px bg-border" />

			<DecorIcon className="size-3.5" position="top-left" />

			{children}
		</div>
	);
}

function PaintingCard({
	image,
	alt,
	icon,
	title,
	description,
	objectPosition = "center",
}: {
	image: string;
	alt: string;
	icon: React.ReactNode;
	title: string;
	description: string;
	objectPosition?: string;
}) {
	return (
		<div className="relative size-full overflow-hidden">
			<img
				alt={alt}
				className="absolute inset-0 size-full object-cover"
				loading="lazy"
				src={image}
				style={{ objectPosition }}
			/>
			<div className="absolute top-4 left-4 flex size-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
				{icon}
			</div>
			<div className="absolute inset-x-0 bottom-0 space-y-1.5 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-6 pt-20">
				<h3 className="font-medium text-white text-xl">{title}</h3>
				<p className="max-w-sm text-white/75">{description}</p>
			</div>
		</div>
	);
}
