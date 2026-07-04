import { PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroPrompt } from "@/features/landing/components/hero-prompt";
import { cn } from "@/lib/utils";

export function HeroSection() {
	return (
		<section className="relative isolate flex min-h-svh flex-col items-center justify-center gap-5 px-4 py-20">
			<div
				aria-hidden="true"
				className="absolute inset-0 -z-1 size-full overflow-hidden"
			>
				<img
					alt=""
					className={cn(
						"absolute inset-x-0 bottom-0 h-auto w-full",
						"opacity-100 transition-opacity duration-700 ease-fluid dark:opacity-0",
						"[-webkit-mask-image:linear-gradient(to_top,transparent_0%,black_14%,black_40%,transparent_88%)]",
						"[mask-image:linear-gradient(to_top,transparent_0%,black_14%,black_40%,transparent_88%)]",
					)}
					fetchPriority="high"
					src="/hero/hero-light.webp"
				/>
				<img
					alt=""
					className={cn(
						"absolute inset-x-0 bottom-0 h-auto w-full",
						"opacity-0 transition-opacity duration-700 ease-fluid dark:opacity-100",
						"[-webkit-mask-image:linear-gradient(to_top,transparent_0%,black_14%,black_40%,transparent_88%)]",
						"[mask-image:linear-gradient(to_top,transparent_0%,black_14%,black_40%,transparent_88%)]",
					)}
					src="/hero/hero-dark.webp"
				/>
				<div className="absolute inset-0 bg-background/40 dark:bg-background/15" />
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

			<h1
				className={cn(
					"max-w-3xl text-balance text-center font-medium text-4xl text-foreground tracking-tight md:text-6xl lg:text-7xl",
					"fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-100 duration-500 ease-snappy",
				)}
			>
				Turn any{" "}
				<span className="font-pixel-grid text-primary italic uppercase">
					question
				</span>{" "}
				into a{" "}
				<span className="font-pixel-grid font-bold text-primary uppercase">
					video
				</span>
			</h1>

			<p
				className={cn(
					"max-w-md text-balance text-center text-muted-foreground md:text-lg",
					"fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-150 duration-500 ease-snappy",
				)}
			>
				Ask anything and get a narrated, animated explainer that makes it click.
			</p>

			<HeroPrompt className="fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-200 duration-500 ease-snappy" />

			<div className="fade-in slide-in-from-bottom-10 flex w-fit animate-in items-center justify-center fill-mode-backwards delay-300 duration-500 ease-snappy">
				<Button
					asChild
					className="border bg-card shadow-sm hover:bg-accent"
					variant="secondary"
				>
					<a href="#video">
						<PlayIcon data-icon="inline-start" /> Watch the video
					</a>
				</Button>
			</div>
		</section>
	);
}
