import { ArrowRightIcon } from "lucide-react";
import { DecorIcon } from "@/components/landing/decor-icon";
import { Button } from "@/components/ui/button";

export function CallToAction() {
	return (
		<div className="relative mx-auto my-20 flex w-full max-w-3xl flex-col justify-between gap-y-4 border-y px-4 py-12 md:my-28 dark:bg-[radial-gradient(35%_80%_at_25%_0%,theme(--color-foreground/.06),transparent)]">
			<DecorIcon className="size-4" position="top-left" />
			<DecorIcon className="size-4" position="top-right" />
			<DecorIcon className="size-4" position="bottom-left" />
			<DecorIcon className="size-4" position="bottom-right" />

			<div className="pointer-events-none absolute -inset-y-6 -left-px w-px border-l" />
			<div className="pointer-events-none absolute -inset-y-6 -right-px w-px border-r" />
			<div className="absolute top-0 left-1/2 -z-10 h-full border-l border-dashed" />

			<h2 className="text-balance text-center font-medium text-2xl tracking-tight md:text-4xl">
				Ready to explain something?
			</h2>
			<p className="mx-auto max-w-md text-balance text-center text-muted-foreground md:text-lg">
				Pick a topic and watch anima research, storyboard, and render your first
				explainer.
			</p>

			<div className="flex items-center justify-center gap-2 pt-2">
				<Button variant="outline">Talk to us</Button>
				<Button>
					Start creating <ArrowRightIcon data-icon="inline-end" />
				</Button>
			</div>
		</div>
	);
}
