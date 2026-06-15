import { DecorIcon } from "@/components/landing/decor-icon";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

export function FaqsSection() {
	return (
		<section
			className="mx-auto grid w-full max-w-5xl grid-cols-1 px-4 py-20 md:grid-cols-2 md:px-8 md:py-28"
			id="faq"
		>
			<div className="pb-8 md:pr-8 md:pb-0">
				<div className="space-y-5">
					<h2 className="text-balance font-medium text-3xl tracking-tight md:text-5xl">
						Frequently asked questions
					</h2>
					<p className="text-muted-foreground">
						The short version of how animus works. Open any question for more.
					</p>
					<p className="text-muted-foreground">
						{"Still curious? "}
						<a className="text-primary hover:underline" href="#top">
							Get in touch
						</a>
						.
					</p>
				</div>
			</div>
			<div className="relative place-content-center">
				<Accordion
					className="rounded-none border-x-0 border-y"
					collapsible
					type="single"
				>
					{faqs.map((item) => (
						<AccordionItem
							className="group relative pl-5"
							key={item.id}
							value={item.id}
						>
							<DecorIcon
								className="left-[13px] size-3 group-last:hidden"
								position="bottom-left"
							/>

							<AccordionTrigger className="px-4 py-4 hover:no-underline focus-visible:underline focus-visible:ring-0">
								{item.title}
							</AccordionTrigger>

							<AccordionContent className="px-4 pb-4 text-muted-foreground">
								{item.content}
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</div>
		</section>
	);
}

const faqs = [
	{
		id: "item-1",
		title: "What exactly does animus produce?",
		content:
			"A narrated, animated explainer video. animus researches your topic, plans the scenes, animates them with Manim, and adds a synced voiceover — you get a finished, shareable film.",
	},
	{
		id: "item-2",
		title: "How is this different from NotebookLM or a slideshow tool?",
		content:
			"Instead of static slides or talking-head audio, animus renders real motion graphics with mathematically precise visuals, and every claim is grounded in sources it actually read.",
	},
	{
		id: "item-3",
		title: "Do I need to know Manim or write any code?",
		content:
			"No. animus writes and runs the Manim code for you inside a sandbox. If you do know Manim, you can review and steer the storyboard before it renders.",
	},
	{
		id: "item-4",
		title: "Can I edit the storyboard before it renders?",
		content:
			"Yes. animus shows you the scene-by-scene plan with narration first. You can reorder, rewrite, or cut scenes before committing to a full render.",
	},
	{
		id: "item-5",
		title: "How does it stay accurate?",
		content:
			"Every explainer begins with a research pass over real sources. The narration is written against those findings, and you can trace claims back to where they came from.",
	},
	{
		id: "item-6",
		title: "What happens when a render breaks?",
		content:
			"animus watches its own output. When a scene has a layout, timing, or code error, it diagnoses and repairs it automatically before handing you the result.",
	},
];
