import { Fragment } from "react";
import { DecorIcon } from "@/components/decor-icon";

const steps = [
	{
		title: "Ask anything",
		description:
			"Drop in a topic, a question, or a paper. animus figures out what needs explaining and to whom.",
	},
	{
		title: "It researches",
		description:
			"It gathers and reads real sources, then assembles the facts the explanation will stand on.",
	},
	{
		title: "It storyboards",
		description:
			"A scene-by-scene plan with narration and visuals, yours to review and adjust before it becomes a video.",
	},
	{
		title: "You get a video",
		description:
			"animus animates each scene, narrates it, and fixes anything that looks off. A finished video, ready to share.",
	},
];

/** The dotted double-chevron that carries each step into the next — the same
 * mark the landing CTA button uses, so the pipeline reads as one system. */
const CHEVRON_DOTS = [
	{ id: "d1", cx: 2, cy: 2 },
	{ id: "d2", cx: 5, cy: 5 },
	{ id: "d3", cx: 8, cy: 8 },
	{ id: "d4", cx: 5, cy: 11 },
	{ id: "d5", cx: 2, cy: 14 },
	{ id: "d6", cx: 6, cy: 2 },
	{ id: "d7", cx: 9, cy: 5 },
	{ id: "d8", cx: 12, cy: 8 },
	{ id: "d9", cx: 9, cy: 11 },
	{ id: "d10", cx: 6, cy: 14 },
];

function StepChevron() {
	return (
		<div
			aria-hidden="true"
			className="flex items-center justify-center py-1 md:py-0"
		>
			<svg
				aria-hidden="true"
				className="rotate-90 text-primary/70 md:rotate-0"
				fill="currentColor"
				height="16"
				viewBox="0 0 14 16"
				width="14"
			>
				{CHEVRON_DOTS.map((dot) => (
					<circle cx={dot.cx} cy={dot.cy} key={dot.id} r="1" />
				))}
			</svg>
		</div>
	);
}

export function HowItWorks() {
	return (
		<section
			className="mx-auto w-full max-w-5xl px-4 py-20 md:px-8 md:py-28"
			id="how"
		>
			<div className="mb-14 space-y-3 text-center">
				<p className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
					How it works
				</p>
				<h2 className="font-medium text-3xl tracking-tight md:text-5xl">
					From a question to a film that sticks
				</h2>
			</div>

			<div className="relative mx-auto max-w-5xl border bg-background dark:bg-[radial-gradient(60%_80%_at_50%_0%,theme(--color-foreground/.05),transparent)]">
				<div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
					{steps.map((step, index) => (
						<Fragment key={step.title}>
							{index > 0 && <StepChevron />}
							<div className="flex flex-col gap-4 p-6 md:p-7">
								<span className="font-pixel-grid text-2xl text-primary">
									{String(index + 1).padStart(2, "0")}
								</span>
								<div className="space-y-2">
									<h3 className="font-medium text-base text-foreground">
										{step.title}
									</h3>
									<p className="text-muted-foreground text-sm leading-relaxed">
										{step.description}
									</p>
								</div>
							</div>
						</Fragment>
					))}
				</div>
				<DecorIcon position="top-left" />
				<DecorIcon position="top-right" />
				<DecorIcon position="bottom-left" />
				<DecorIcon position="bottom-right" />
			</div>
		</section>
	);
}
