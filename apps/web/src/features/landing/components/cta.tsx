import { ArrowRightIcon } from "lucide-react";
import { Link } from "react-router";
import { LogoMark } from "@/components/brand/logo-mark";
import { DecorIcon } from "@/components/decor-icon";
import { Button } from "@/components/ui/button";
import { useCtaTarget } from "@/features/landing/hooks/use-cta-target";

export function CallToAction() {
	const ctaTarget = useCtaTarget();

	return (
		<div className="relative mx-auto my-20 flex w-full max-w-3xl flex-col items-center justify-between gap-y-5 border-y px-4 py-14 md:my-28 dark:bg-[radial-gradient(35%_80%_at_25%_0%,theme(--color-foreground/.06),transparent)]">
			<DecorIcon className="size-4" position="top-left" />
			<DecorIcon className="size-4" position="top-right" />
			<DecorIcon className="size-4" position="bottom-left" />
			<DecorIcon className="size-4" position="bottom-right" />

			<div className="pointer-events-none absolute -inset-y-6 -left-px w-px border-l" />
			<div className="pointer-events-none absolute -inset-y-6 -right-px w-px border-r" />
			<div className="absolute top-0 left-1/2 -z-10 h-full border-l border-dashed" />

			<LogoMark className="h-10 w-auto" />

			<h2 className="text-balance text-center font-medium text-3xl tracking-tight md:text-4xl">
				Stay curious. Stay sharp.
			</h2>
			<p className="mx-auto max-w-md text-balance text-center text-muted-foreground md:text-lg">
				Next time you're curious, don't settle for an answer you'll forget by
				morning. Turn it into an explainer that sticks.
			</p>

			<div className="flex items-center justify-center gap-2 pt-1">
				<Button asChild size="lg">
					<Link to={ctaTarget}>
						Ask your first question <ArrowRightIcon data-icon="inline-end" />
					</Link>
				</Button>
			</div>
		</div>
	);
}
