import {
	CheckCircleIcon,
	FilePenIcon,
	GlobeIcon,
	ListChecksIcon,
	TerminalIcon,
} from "lucide-react";
import type React from "react";
import { useCurrentFrame } from "remotion";
import { LogoMark } from "@/components/logo-mark";
import { enter, ramp } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** The pieces of a real animus turn, rebuilt with the app's own classes.
 *
 * The tool cards mirror `features/studio/components/tools/*`: a one-line
 * bordered card on `bg-card` with a lucide glyph, a label, and a truncated
 * detail. Nothing here is invented chrome; the point of the demo beat is that
 * the audience sees the interface they will actually get. */

/** Anything in the transcript enters with the app's `tool-enter` feel. */
function Entering({
	at,
	children,
	className,
}: {
	at: number;
	children: React.ReactNode;
	className?: string;
}): React.JSX.Element {
	const frame = useCurrentFrame();
	return (
		<div
			className={className}
			style={enter(ramp(frame, at, 14), { rise: 10, blur: 4 })}
		>
			{children}
		</div>
	);
}

export function UserMessage({
	at,
	children,
}: {
	at: number;
	children: React.ReactNode;
}): React.JSX.Element {
	return (
		<Entering at={at} className="flex justify-end">
			<div className="max-w-[80%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-[15px] text-secondary-foreground">
				{children}
			</div>
		</Entering>
	);
}

/** Assistant prose, revealed word by word the way Streamdown renders a live
 * token stream in the app. */
export function AssistantText({
	at,
	text,
	wordsPerSecond = 9,
}: {
	at: number;
	text: string;
	wordsPerSecond?: number;
}): React.JSX.Element {
	const frame = useCurrentFrame();
	const words = text.split(" ");

	return (
		<div className="flex gap-3">
			<LogoMark animate="loading" className="mt-0.5 size-6 shrink-0" />
			<p className="text-[15px] text-foreground leading-relaxed">
				{words.map((word, index) => (
					<span
						className="inline-block whitespace-pre"
						key={`${word}-${index === 0 ? "first" : index}`}
						style={enter(ramp(frame, at + (index * 60) / wordsPerSecond, 9), {
							rise: 4,
							blur: 4,
						})}
					>
						{word}{" "}
					</span>
				))}
			</p>
		</div>
	);
}

type ToolLineProps = {
	at: number;
	icon: React.ReactNode;
	title: string;
	detail?: string;
	/** Frames after `at` when the step flips to done. */
	doneAfter?: number;
};

/** The compact sandbox-step card (`ManimStep` in the app). */
export function ToolLine({
	at,
	icon,
	title,
	detail,
	doneAfter = 40,
}: ToolLineProps): React.JSX.Element {
	const frame = useCurrentFrame();
	const done = frame >= at + doneAfter;

	return (
		<Entering at={at}>
			<div className="flex items-center gap-2 rounded-sm border bg-card px-2.5 py-2">
				<span
					className={cn(
						"shrink-0",
						done ? "text-primary" : "text-muted-foreground",
					)}
				>
					{icon}
				</span>
				<span className="shrink-0 font-medium text-[13px]">{title}</span>
				{detail ? (
					<code className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
						{detail}
					</code>
				) : (
					<span className="flex-1" />
				)}
				<CheckCircleIcon
					className="size-3.5 shrink-0 text-primary"
					style={{ opacity: ramp(frame, at + doneAfter, 10) }}
				/>
			</div>
		</Entering>
	);
}

export const toolIcons = {
	search: <GlobeIcon className="size-3.5" />,
	write: <FilePenIcon className="size-3.5" />,
	run: <TerminalIcon className="size-3.5" />,
	plan: <ListChecksIcon className="size-3.5" />,
};

/** The web-research card: sources the answer is actually standing on. */
export function SourcesCard({
	at,
	query,
	sources,
}: {
	at: number;
	query: string;
	sources: string[];
}): React.JSX.Element {
	const frame = useCurrentFrame();

	return (
		<Entering at={at}>
			<div className="overflow-hidden rounded-sm border bg-card">
				<div className="flex items-center gap-2 px-2.5 py-2">
					<GlobeIcon className="size-3.5 shrink-0 text-muted-foreground" />
					<span className="shrink-0 font-medium text-[13px]">
						Searched the web
					</span>
					<code className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
						{query}
					</code>
				</div>
				<div className="flex flex-wrap gap-1.5 border-t px-2.5 py-2">
					{sources.map((source, index) => (
						<span
							className="rounded-full border bg-muted px-2 py-1 text-[11px] text-muted-foreground"
							key={source}
							style={enter(ramp(frame, at + 12 + index * 7, 12), {
								rise: 6,
								blur: 3,
							})}
						>
							{source}
						</span>
					))}
				</div>
			</div>
		</Entering>
	);
}

/** The finalised video plan: the HITL moment, and the beat that proves this is
 * a collaborator rather than a black box. */
export function PlanCard({
	at,
	scenes,
}: {
	at: number;
	scenes: string[];
}): React.JSX.Element {
	const frame = useCurrentFrame();

	return (
		<Entering at={at}>
			<div className="overflow-hidden rounded-md border bg-card">
				<div className="flex items-center gap-2 border-b px-3 py-2">
					<ListChecksIcon className="size-3.5 text-primary" />
					<span className="font-medium text-[13px]">Video plan</span>
					<span className="ml-auto rounded-full border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
						{scenes.length} scenes
					</span>
				</div>
				<div className="divide-y">
					{scenes.map((scene, index) => (
						<div
							className="flex items-center gap-3 px-3 py-1.5"
							key={scene}
							style={enter(ramp(frame, at + 10 + index * 8, 12), {
								rise: 6,
								blur: 3,
							})}
						>
							<span className="font-pixel-grid text-[13px] text-primary">
								{String(index + 1).padStart(2, "0")}
							</span>
							<span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
								{scene}
							</span>
						</div>
					))}
				</div>
			</div>
		</Entering>
	);
}
