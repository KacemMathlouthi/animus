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

			<div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:h-[40rem] lg:grid-cols-3">
				<FeatureCard className="h-96 p-0 md:h-[28rem] lg:h-full">
					<div className="relative size-full overflow-hidden">
						<img
							alt="Raphael, The School of Athens"
							className="absolute inset-0 size-full object-cover"
							loading="lazy"
							src="/features/research-grounded.webp"
							style={{ objectPosition: "50% 38%" }}
						/>
						<div className="absolute inset-x-0 bottom-0 space-y-1.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 pt-24">
							<h3 className="font-medium text-white text-xl">
								Research-grounded
							</h3>
							<p className="max-w-sm text-white/75">
								Starts from real sources, so the narration stays accurate
								instead of plausible.
							</p>
						</div>
					</div>
				</FeatureCard>

				<div className="flex flex-col gap-6">
					<FeatureCard className="h-80 p-0 lg:h-auto lg:flex-1">
						<div className="relative size-full overflow-hidden">
							<img
								alt="Leonardo da Vinci, Vitruvian Man"
								className="absolute inset-0 size-full object-cover"
								loading="lazy"
								src="/features/precision.webp"
								style={{ objectPosition: "50% 30%" }}
							/>
							<div className="absolute inset-0 bg-black/45" />
							<div className="absolute inset-0 flex items-center justify-center px-4 pb-16">
								<p className="font-pixel-grid text-4xl text-white tracking-tight drop-shadow-lg sm:text-5xl">
									e<sup className="text-2xl sm:text-3xl">iπ</sup>
									{" + 1 = 0"}
								</p>
							</div>
							<div className="absolute inset-x-0 bottom-0 space-y-1.5 bg-gradient-to-t from-black/85 to-transparent p-6 pt-16">
								<h3 className="font-medium text-white text-xl">
									Precise, not hand-wavy
								</h3>
								<p className="max-w-sm text-white/75">
									Equations, graphs, and transforms are drawn exactly, never
									rough approximations.
								</p>
							</div>
						</div>
					</FeatureCard>

					<FeatureCard className="h-80 p-0 lg:h-auto lg:flex-1">
						<div className="relative size-full overflow-hidden">
							<img
								alt="Claude Lorrain, Seaport with the Embarkation of the Queen of Sheba"
								className="absolute inset-0 size-full object-cover"
								loading="lazy"
								src="/features/share.webp"
								style={{ objectPosition: "50% 55%" }}
							/>
							<div className="absolute inset-x-0 bottom-0 space-y-1.5 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-6 pt-16">
								<h3 className="font-medium text-white text-xl">
									Ready to share
								</h3>
								<p className="max-w-sm text-white/75">
									A polished video you can download, post, or send in a click.
								</p>
							</div>
						</div>
					</FeatureCard>
				</div>

				<FeatureCard className="h-96 p-0 md:col-span-2 md:h-[28rem] lg:col-span-1 lg:h-full">
					<div className="relative size-full overflow-hidden">
						<img
							alt="Caravaggio, The Lute Player"
							className="absolute inset-0 size-full object-cover"
							loading="lazy"
							src="/features/narration.webp"
							style={{ objectPosition: "50% 40%" }}
						/>
						<div className="absolute inset-x-0 bottom-0 space-y-1.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 pt-24">
							<h3 className="font-medium text-white text-xl">Real narration</h3>
							<p className="max-w-sm text-white/75">
								Studio-grade voiceover, written and synced to the animation, not
								bolted on afterwards.
							</p>
						</div>
					</div>
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
				"relative flex flex-col justify-between gap-6 bg-background shadow-xs",
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
