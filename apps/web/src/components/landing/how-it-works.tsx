import { DecorIcon } from "@/components/landing/decor-icon";

const steps = [
	{
		title: "Describe it",
		description:
			"Drop in a topic, a question, or a paper. anima figures out what needs explaining and to whom.",
	},
	{
		title: "It researches",
		description:
			"It gathers and reads real sources, then assembles the facts the explanation will stand on.",
	},
	{
		title: "It storyboards",
		description:
			"A scene-by-scene plan with narration and visuals — yours to review and adjust before rendering.",
	},
	{
		title: "It renders",
		description:
			"anima animates each scene in Manim, narrates it, and repairs anything that looks off. You get a video.",
	},
];

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
					From a prompt to a finished film
				</h2>
			</div>

			<div className="relative mx-auto max-w-5xl border">
				<div className="grid grid-cols-1 gap-px bg-border md:grid-cols-4">
					{steps.map((step, index) => (
						<div
							className="flex flex-col gap-4 bg-background p-6 md:p-7"
							key={step.title}
						>
							<span className="font-medium font-mono text-2xl text-muted-foreground/60">
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
