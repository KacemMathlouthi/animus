import { CheckIcon, DownloadIcon, LinkIcon, Volume2Icon } from "lucide-react";
import type React from "react";
import {
	AbsoluteFill,
	Img,
	interpolate,
	Sequence,
	staticFile,
	useCurrentFrame,
} from "remotion";
import { CornerFrame, Stage } from "@/components/chrome";
import { Headline, Kicker, PixelWord } from "@/components/type";
import { Waveform } from "@/components/waveform";
import { easeFluid, easeSnappy, enter, ramp, window_ } from "@/lib/motion";
import { sec } from "@/lib/timing";
import { cn } from "@/lib/utils";

/** Beat 03. What you actually get, at pace.
 *
 * Four claims, four paintings, roughly three seconds each. The artwork is the
 * landing page's own feature imagery, so the montage doubles as a tour of the
 * site. Each card alternates sides, and each carries one small piece of live
 * proof rather than a bullet: sources, an exact equation, a voice, a link. */

const CARD = sec(3.4);
const INTRO = sec(2.2);

type Feature = {
	id: string;
	image: string;
	alt: string;
	title: string;
	body: string;
	proof: React.ReactNode;
};

/** The source chips from the research card, restated as evidence. */
function Sources(): React.JSX.Element {
	return (
		<div className="flex flex-wrap gap-2.5">
			{["3blue1brown.com", "arxiv.org", "mathworld.wolfram.com"].map(
				(source) => (
					<span
						className="rounded-full border border-border bg-muted px-4 py-2 text-[20px] text-muted-foreground"
						key={source}
					>
						{source}
					</span>
				),
			)}
		</div>
	);
}

function Equation(): React.JSX.Element {
	return (
		<p className="font-pixel-grid text-[52px] text-foreground tracking-tight">
			e<sup className="text-[32px]">iπ</sup> + 1 = 0
		</p>
	);
}

function Voice(): React.JSX.Element {
	return (
		<div className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4">
			<Volume2Icon className="size-6 text-primary" />
			<Waveform bars={34} className="h-8" speed={0.25} />
			<span className="text-[20px] text-muted-foreground">
				Narration, in sync
			</span>
		</div>
	);
}

function ShareRow(): React.JSX.Element {
	return (
		<div className="flex items-center gap-3">
			<span className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-3 text-[20px] text-foreground">
				<DownloadIcon className="size-5 text-muted-foreground" /> Download mp4
			</span>
			<span className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-3 text-[20px] text-foreground">
				<LinkIcon className="size-5 text-muted-foreground" /> tryanimus.app/v/…
			</span>
			<span className="flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-[20px] text-primary-foreground">
				<CheckIcon className="size-5" /> Copied
			</span>
		</div>
	);
}

const FEATURES: Feature[] = [
	{
		id: "research",
		image: "features/research-grounded.webp",
		alt: "Raphael, The School of Athens",
		title: "Research-grounded",
		body: "It starts from real sources, so the narration stays accurate instead of merely plausible.",
		proof: <Sources />,
	},
	{
		id: "precision",
		image: "features/precision.webp",
		alt: "Leonardo da Vinci, Vitruvian Man",
		title: "Precise, not hand-wavy",
		body: "Equations, graphs and transforms are drawn exactly, never roughly approximated.",
		proof: <Equation />,
	},
	{
		id: "narration",
		image: "features/narration.webp",
		alt: "Caravaggio, The Lute Player",
		title: "Real narration",
		body: "Studio-grade voiceover, written and synced to the animation, not bolted on afterwards.",
		proof: <Voice />,
	},
	{
		id: "share",
		image: "features/share.webp",
		alt: "Claude Lorrain, Seaport with the Embarkation of the Queen of Sheba",
		title: "Ready to share",
		body: "A finished video you can download, post, or send as a link, in one click.",
		proof: <ShareRow />,
	},
];

function FeatureCard({
	feature,
	index,
}: {
	feature: Feature;
	index: number;
}): React.JSX.Element {
	const frame = useCurrentFrame();
	const flipped = index % 2 === 1;

	const inProgress = ramp(frame, 0, sec(0.7), easeSnappy);
	const out = ramp(frame, CARD - sec(0.5), sec(0.5), easeFluid);
	// Ken Burns: the painting drifts through the whole card, never still.
	const drift = interpolate(frame, [0, CARD], [0, 1], {
		extrapolateRight: "clamp",
	});

	return (
		<AbsoluteFill
			style={{
				opacity: inProgress * (1 - out),
				filter: `blur(${(1 - inProgress) * 10 + out * 10}px)`,
			}}
		>
			<div className={cn("flex h-full w-full", flipped && "flex-row-reverse")}>
				{/* The painting. */}
				<div className="relative h-full w-[46%] overflow-hidden">
					<Img
						alt={feature.alt}
						className="absolute inset-0 h-full w-full object-cover"
						src={staticFile(feature.image)}
						style={{
							transform: `scale(${interpolate(drift, [0, 1], [1.06, 1.16])}) translateX(${interpolate(
								drift,
								[0, 1],
								[0, flipped ? 14 : -14],
							)}px)`,
							objectPosition: "50% 40%",
						}}
					/>
					{/* Fade the artwork into the canvas so there is no hard seam. */}
					<AbsoluteFill
						style={{
							background: `linear-gradient(to ${flipped ? "left" : "right"}, transparent 45%, var(--background) 98%)`,
						}}
					/>
					<AbsoluteFill className="bg-background/35" />
				</div>

				{/* The claim. */}
				<div className="flex h-full flex-1 flex-col justify-center gap-8 px-24">
					<span
						className="font-pixel-grid text-[30px] text-primary"
						style={enter(ramp(frame, sec(0.1), sec(0.5)), {
							rise: 10,
							blur: 4,
						})}
					>
						{String(index + 1).padStart(2, "0")}
					</span>

					<Headline
						className="text-[76px] leading-[1.05]"
						style={enter(ramp(frame, sec(0.2), sec(0.6)), {
							rise: 30,
							blur: 10,
						})}
					>
						{feature.title}
					</Headline>

					<p
						className="max-w-[760px] text-[30px] text-muted-foreground leading-relaxed"
						style={enter(ramp(frame, sec(0.4), sec(0.6)), {
							rise: 22,
							blur: 8,
						})}
					>
						{feature.body}
					</p>

					<div
						style={enter(ramp(frame, sec(0.75), sec(0.6)), {
							rise: 18,
							blur: 6,
						})}
					>
						{feature.proof}
					</div>
				</div>
			</div>
		</AbsoluteFill>
	);
}

export function Features(): React.JSX.Element {
	const frame = useCurrentFrame();
	const title = window_(frame, 0, INTRO + sec(0.4), sec(0.5));

	return (
		<Stage>
			{/* The section title, exactly as the landing page words it. */}
			<AbsoluteFill className="items-center justify-center">
				<div
					className="flex flex-col items-center gap-7 text-center"
					style={{ opacity: title, filter: `blur(${(1 - title) * 10}px)` }}
				>
					<Kicker>Why animus</Kicker>
					<Headline className="max-w-[1500px] text-[92px] leading-[1.05]">
						Everything it takes to make it <PixelWord>click</PixelWord>
					</Headline>
				</div>
			</AbsoluteFill>

			{FEATURES.map((feature, index) => (
				<Sequence
					durationInFrames={CARD}
					from={INTRO + index * CARD}
					key={feature.id}
				>
					<FeatureCard feature={feature} index={index} />
				</Sequence>
			))}

			<CornerFrame size={22} />
		</Stage>
	);
}
