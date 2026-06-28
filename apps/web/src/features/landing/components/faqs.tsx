import { DecorIcon } from "@/components/decor-icon";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

/** The "Got any questions?" cascade: bold repeats stepping diagonally, the way
 * a16z's FAQ does it. Indents wave out and back so it reads as motion, not a list. */
const CASCADE = [
	{ id: "c1", indent: "pl-0" },
	{ id: "c2", indent: "pl-3 md:pl-6" },
	{ id: "c3", indent: "pl-6 md:pl-12" },
	{ id: "c4", indent: "pl-9 md:pl-20" },
	{ id: "c5", indent: "pl-6 md:pl-12" },
	{ id: "c6", indent: "pl-3 md:pl-6" },
	{ id: "c7", indent: "pl-0" },
];

export function FaqsSection() {
	return (
		<section
			className="mx-auto grid w-full max-w-5xl grid-cols-1 px-4 py-20 md:grid-cols-2 md:px-8 md:py-28"
			id="faq"
		>
			<div className="flex flex-col justify-center gap-0.5 pb-8 md:pr-8 md:pb-0">
				{CASCADE.map((line, i) => (
					<p
						className={cn(
							"font-semibold text-3xl tracking-tighter md:text-4xl",
							line.indent,
							i % 2 === 1 ? "text-foreground" : "text-foreground/35",
						)}
						key={line.id}
					>
						Got any questions?
					</p>
				))}
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
			"A narrated, animated explainer video. animus researches your topic, plans the scenes, animates them, and adds a synced voiceover, so you get a finished, shareable film.",
	},
	{
		id: "item-2",
		title: "How is this different from NotebookLM or a slideshow tool?",
		content:
			"Instead of static slides or talking-head audio, animus creates real motion graphics with precise, accurate visuals, and every claim is grounded in sources it actually read.",
	},
	{
		id: "item-3",
		title: "Do I need to know animation or write any code?",
		content:
			"No. animus does all the animation for you. You just describe what you want to understand, then review and steer the storyboard before it becomes a video.",
	},
	{
		id: "item-4",
		title: "Can I edit the storyboard before it becomes a video?",
		content:
			"Yes. animus shows you the scene-by-scene plan with narration first. You can reorder, rewrite, or cut scenes before committing to the final video.",
	},
	{
		id: "item-5",
		title: "How does it stay accurate?",
		content:
			"Every explainer begins with a research pass over real sources. The narration is written against those findings, and you can trace claims back to where they came from.",
	},
	{
		id: "item-6",
		title: "What if a video comes out wrong?",
		content:
			"animus checks its own work. When a scene has a layout or timing problem, it diagnoses and fixes it automatically before handing you the result.",
	},
];
