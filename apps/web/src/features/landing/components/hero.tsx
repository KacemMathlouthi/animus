import { ArrowRightIcon, PlayIcon } from "lucide-react";
import { Link } from "react-router";
import { DecorIcon } from "@/components/decor-icon";
import { Button } from "@/components/ui/button";
import { FullWidthDivider } from "@/features/landing/components/full-width-divider";
import { StudioPreview } from "@/features/landing/components/studio-preview";
import { useCtaTarget } from "@/features/landing/hooks/use-cta-target";
import { cn } from "@/lib/utils";

export function HeroSection() {
	const ctaTarget = useCtaTarget();

	return (
		<section>
			<div className="relative isolate flex min-h-svh flex-col items-center justify-center gap-5 px-4 py-20">
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
					Explainers that animate themselves
				</h1>

				<p
					className={cn(
						"max-w-xl text-balance text-center text-muted-foreground md:text-lg",
						"fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-200 duration-500 ease-snappy",
					)}
				>
					Ask about anything you want to understand. animus turns it into a
					clear, narrated video that makes the idea stick, grounded in real
					sources and ready to share.
				</p>

				<div className="fade-in slide-in-from-bottom-10 flex w-fit animate-in items-center justify-center gap-3 fill-mode-backwards pt-2 delay-300 duration-500 ease-snappy">
					<Button
						asChild
						className="dark:border-border dark:bg-card dark:hover:bg-accent"
						variant="outline"
					>
						<a href="#demo">
							<PlayIcon data-icon="inline-start" /> Watch a demo
						</a>
					</Button>
					<Button asChild>
						<Link to={ctaTarget}>
							Start creating <ArrowRightIcon data-icon="inline-end" />
						</Link>
					</Button>
				</div>
			</div>

			<div
				className="relative flex min-h-svh scroll-mt-20 flex-col items-center justify-center gap-10 px-4 py-20"
				id="demo"
			>
				<DecorIcon className="size-4" position="top-left" />
				<DecorIcon className="size-4" position="top-right" />
				<DecorIcon className="size-4" position="bottom-left" />
				<DecorIcon className="size-4" position="bottom-right" />

				<FullWidthDivider className="-top-px" />

				<div className="space-y-3 text-center">
					<p className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
						See it in action
					</p>
					<h2 className="font-medium text-3xl text-foreground tracking-tight md:text-5xl">
						Watch animus turn a question into a video
					</h2>
				</div>

				<div className="mx-auto w-full max-w-5xl px-4 md:px-8">
					<StudioPreview />
				</div>

				<FullWidthDivider className="-bottom-px" />
			</div>
		</section>
	);
}
