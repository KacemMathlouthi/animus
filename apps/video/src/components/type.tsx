import type React from "react";
import { useCurrentFrame } from "remotion";
import { enter, ramp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Typography that speaks in the product's voice.
 *
 * The landing page has exactly two typographic gestures: Geist for everything,
 * and one pixel-grid word per line carrying the meaning. The film keeps that
 * discipline: never more than one accent word in view. */

/** The small mono label above a headline ("Watch", "Why animus", …). */
export function Kicker({
	children,
	className,
	progress = 1,
}: {
	children: React.ReactNode;
	className?: string;
	progress?: number;
}): React.JSX.Element {
	return (
		<p
			className={cn(
				"font-mono text-muted-foreground text-lg uppercase tracking-[0.28em]",
				className,
			)}
			style={enter(progress, { rise: 12, blur: 4 })}
		>
			{children}
		</p>
	);
}

/** The accent word: pixel-grid face, hero gradient fill. */
export function PixelWord({
	children,
	className,
	italic = false,
}: {
	children: React.ReactNode;
	className?: string;
	italic?: boolean;
}): React.JSX.Element {
	return (
		<span
			className={cn("film-word uppercase", italic && "italic", className)}
			// The pixel face has generous side bearings; pull them in so the word
			// optically sits with the sentence rather than floating off it.
			style={{ paddingRight: "0.12em", marginRight: "-0.06em" }}
		>
			{children}
		</span>
	);
}

/** Reveals its children word by word with the app's blur-in entrance.
 * `text` may contain `*asterisks*` to mark a pixel-grid accent word. */
export function WordsIn({
	text,
	start,
	className,
	step = 3,
	duration = 22,
	rise = 22,
}: {
	text: string;
	start: number;
	className?: string;
	step?: number;
	duration?: number;
	rise?: number;
}): React.JSX.Element {
	const frame = useCurrentFrame();

	return (
		<span className={cn("inline-block", className)}>
			{text.split(" ").map((word, index) => {
				// `*word*` marks the accent; trailing punctuation stays in Geist so a
				// full stop never renders in the pixel face.
				const marked = word.match(/^\*(.+?)\*(.*)$/);
				const progress = ramp(frame, start + stagger(index, step), duration);

				return (
					<span
						className="inline-block whitespace-pre"
						key={`${word}-${index === 0 ? "first" : index}`}
						style={enter(progress, { rise, blur: 10 })}
					>
						{marked ? (
							<>
								<PixelWord>{marked[1]}</PixelWord>
								{marked[2]}
							</>
						) : (
							word
						)}{" "}
					</span>
				);
			})}
		</span>
	);
}

/** Character-by-character typing with a blinking caret, used wherever the film
 * shows someone actually using the product. */
export function Typewriter({
	text,
	start,
	cps = 26,
	className,
	caret = true,
	caretAfterDone = true,
}: {
	text: string;
	start: number;
	/** Characters per second. */
	cps?: number;
	className?: string;
	caret?: boolean;
	caretAfterDone?: boolean;
}): React.JSX.Element {
	const frame = useCurrentFrame();
	const elapsed = Math.max(0, frame - start);
	const shown = Math.min(text.length, Math.floor((elapsed / 60) * cps));
	const done = shown >= text.length;
	// 1.06s blink, the platform default, so it reads as a real text cursor.
	const caretOn = Math.floor(frame / 32) % 2 === 0;

	return (
		<span className={className}>
			{text.slice(0, shown)}
			{caret && (!done || caretAfterDone) && frame >= start ? (
				<span
					className="ml-0.5 inline-block w-[2px] translate-y-[2px] bg-primary align-middle"
					style={{ height: "1.05em", opacity: done ? (caretOn ? 1 : 0) : 1 }}
				/>
			) : null}
		</span>
	);
}

/** A headline that also holds the film together: same tracking and weight as
 * the landing page's h1/h2. */
export function Headline({
	children,
	className,
	...rest
}: React.ComponentProps<"h2">): React.JSX.Element {
	return (
		<h2
			className={cn(
				"text-balance font-medium text-foreground tracking-tight",
				className,
			)}
			{...rest}
		>
			{children}
		</h2>
	);
}
