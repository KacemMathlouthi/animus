import { ArrowRightIcon, PlayIcon } from "lucide-react";
import { DecorIcon } from "@/components/decor-icon";
import { Button } from "@/components/ui/button";
import { FullWidthDivider } from "@/features/landing/components/full-width-divider";
import { StudioPreview } from "@/features/landing/components/studio-preview";
import { cn } from "@/lib/utils";

export function HeroSection() {
	return (
		<section>
			<div className="relative flex min-h-svh flex-col items-center justify-center gap-5 px-4 py-20">
				{/* X Faded Borders & Shades */}
				<div
					aria-hidden="true"
					className="absolute inset-0 -z-1 size-full overflow-hidden"
				>
					<div
						className={cn(
							"absolute -inset-x-20 inset-y-0 z-0 rounded-full",
							"bg-[radial-gradient(ellipse_at_center,theme(--color-foreground/.05),transparent,transparent)]",
							"blur-[50px]",
						)}
					/>
					<div className="absolute inset-y-0 left-4 w-px bg-linear-to-b from-transparent via-border to-border md:left-8" />
					<div className="absolute inset-y-0 right-4 w-px bg-linear-to-b from-transparent via-border to-border md:right-8" />
					<div className="absolute inset-y-0 left-8 w-px bg-linear-to-b from-transparent via-border/50 to-border/50 md:left-12" />
					<div className="absolute inset-y-0 right-8 w-px bg-linear-to-b from-transparent via-border/50 to-border/50 md:right-12" />
				</div>

				<a
					className={cn(
						"group mx-auto flex w-fit items-center gap-3 rounded-sm border bg-card p-1 shadow-xs",
						"fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards transition-all delay-500 duration-500 ease-out",
					)}
					href="#features"
				>
					<div className="rounded-xs border bg-card px-1.5 py-0.5 shadow-sm">
						<p className="font-mono text-xs">NEW</p>
					</div>
					<span className="text-xs">now in private beta</span>
					<span className="block h-5 border-l" />
					<div className="pr-1">
						<ArrowRightIcon className="size-3 -translate-x-0.5 duration-150 ease-out group-hover:translate-x-0.5" />
					</div>
				</a>

				<h1
					className={cn(
						"max-w-3xl text-balance text-center font-medium text-4xl text-foreground tracking-tight md:text-6xl lg:text-7xl",
						"fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-100 duration-500 ease-out",
					)}
				>
					Explainers that animate themselves
				</h1>

				<p
					className={cn(
						"max-w-xl text-balance text-center text-muted-foreground md:text-lg",
						"fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-200 duration-500 ease-out",
					)}
				>
					animus researches your topic, storyboards it, and renders a narrated,
					math-precise video — grounded in real sources and ready to share.
				</p>

				<div className="fade-in slide-in-from-bottom-10 flex w-fit animate-in items-center justify-center gap-3 fill-mode-backwards pt-2 delay-300 duration-500 ease-out">
					<Button variant="outline">
						<PlayIcon data-icon="inline-start" /> Watch a demo
					</Button>
					<Button>
						Start creating <ArrowRightIcon data-icon="inline-end" />
					</Button>
				</div>
			</div>

			<div className="relative">
				<DecorIcon className="size-4" position="top-left" />
				<DecorIcon className="size-4" position="top-right" />
				<DecorIcon className="size-4" position="bottom-left" />
				<DecorIcon className="size-4" position="bottom-right" />

				<FullWidthDivider className="-top-px" />
				<div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
					<StudioPreview />
				</div>
				<FullWidthDivider className="-bottom-px" />
			</div>
		</section>
	);
}
