import { DecorIcon } from "@/components/decor-icon";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

/** The "Got any questions?" cascade: bold repeats stepping diagonally (a16z-style),
 * indents waving out and back so it reads as motion, not a list. */
const CASCADE = [
	{ id: "c1", indent: "" },
	{ id: "c2", indent: "md:pl-6" },
	{ id: "c3", indent: "md:pl-12" },
	{ id: "c4", indent: "md:pl-20" },
	{ id: "c5", indent: "md:pl-12" },
	{ id: "c6", indent: "md:pl-6" },
	{ id: "c7", indent: "" },
];

export function FaqsSection() {
	return (
		<section
			className="mx-auto grid w-full max-w-5xl grid-cols-1 px-4 py-20 md:grid-cols-2 md:px-8 md:py-28"
			id="faq"
		>
			{/* One real heading for assistive tech; the visual cascade repeats it
			    decoratively and is hidden from screen readers to avoid 7× readout. */}
			{/* Below md the decorative cascade is ~300px of aria-hidden noise, so
			    it is dropped and this heading becomes the visible one instead. */}
			<h2 className="pb-8 text-center font-semibold text-3xl tracking-tighter md:sr-only">
				Got any questions?
			</h2>
			<div
				aria-hidden="true"
				className="hidden flex-col justify-center gap-0.5 pb-8 text-center md:flex md:pr-8 md:pb-0 md:text-left"
			>
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
								className="left-3.25 size-3 group-last:hidden"
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
		id: "item-pricing",
		title: "Is it free? What does it cost?",
		content:
			"You start with $5.00 in free credits, no credit card required, just a quick sign-in. Each video draws from that balance based on its length and complexity. When your credits run out, you can connect your own API keys (an Anthropic, OpenAI, or Google key for the writing and an ElevenLabs key for narration), and anything that runs on your keys isn't charged against your credits.",
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
