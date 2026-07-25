import { ArrowUpIcon, GiftIcon, LightbulbIcon } from "lucide-react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useStartConversation } from "@/features/studio/hooks/use-start-conversation";
import { useSession } from "@/lib/auth-client";
import { stashPendingPrompt } from "@/lib/pending-prompt";
import { cn } from "@/lib/utils";

const MAX_TEXTAREA_HEIGHT = 168;

/** Ready-made questions the "Prompts" button cycles into the input, a nudge
 * for visitors who don't know what to ask yet. */
const EXAMPLE_PROMPTS = [
	"Why is the sky blue?",
	"How do neural networks learn?",
	"What is a Fourier transform?",
	"How does RSA keep a secret?",
	"Why do planets orbit in ellipses?",
];

export function HeroPrompt({ className }: { className?: string }) {
	const { data: session } = useSession();
	const navigate = useNavigate();
	const { start, creating } = useStartConversation();
	const [text, setText] = useState("");
	const [exampleIndex, setExampleIndex] = useState(0);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const syncHeight = (el: HTMLTextAreaElement) => {
		el.style.height = "0px";
		el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
	};

	// Grow the textarea with its content up to a cap, then scroll. Driven off the
	// input event's element (already carries the new value), so no effect needed.
	const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
		setText(event.target.value);
		syncHeight(event.target);
	};

	// Fills the input with the next example; the height sync runs next frame,
	// once the new value has rendered into the element.
	const cyclePrompt = () => {
		setText(EXAMPLE_PROMPTS[exampleIndex % EXAMPLE_PROMPTS.length]);
		setExampleIndex(exampleIndex + 1);
		const el = textareaRef.current;
		if (!el) {
			return;
		}
		el.focus();
		requestAnimationFrame(() => syncHeight(el));
	};

	const submit = useCallback(
		(value: string) => {
			const trimmed = value.trim();
			if (!trimmed || creating) {
				return;
			}
			if (session) {
				start(trimmed);
				return;
			}
			// Signed out: carry the prompt through auth (a full page reload), then
			// the studio replays it. `from` lands them in the studio afterwards.
			stashPendingPrompt(trimmed);
			navigate("/auth", { state: { from: "/studio" } });
		},
		[session, creating, start, navigate],
	);

	const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (
			event.key === "Enter" &&
			!(event.shiftKey || event.nativeEvent.isComposing)
		) {
			event.preventDefault();
			submit(text);
		}
	};

	const canSubmit = text.trim().length > 0 && !creating;

	return (
		<div className={cn("w-full max-w-2xl", className)}>
			<div className="cta-surface flex flex-col gap-2 rounded-xl p-2.5">
				<div className="flex items-center gap-1.5 px-1.5 pt-0.5 font-medium text-muted-foreground text-xs">
					<GiftIcon aria-hidden="true" className="size-3.5 text-primary" />
					<span>
						<span className="text-foreground">$5.00 in free credits.</span> No
						card required.
					</span>
				</div>

				<form
					className={cn(
						"prompt-well flex flex-col gap-2.5 rounded-lg border p-3",
						"transition-[border-color] duration-200 ease-snappy focus-within:border-primary/45",
					)}
					onSubmit={(event) => {
						event.preventDefault();
						submit(text);
					}}
				>
					<textarea
						aria-label="Describe what you want explained"
						className="min-h-20 w-full resize-none bg-transparent px-1.5 py-2 text-base outline-none placeholder:text-muted-foreground"
						onChange={onChange}
						onKeyDown={onKeyDown}
						placeholder="Explain how…"
						ref={textareaRef}
						rows={2}
						value={text}
					/>

					<div className="flex items-center justify-between">
						<button
							className="prompt-chip flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-muted-foreground text-xs transition-[filter,color] duration-200 ease-snappy hover:brightness-105 hover:text-foreground"
							onClick={cyclePrompt}
							type="button"
						>
							<LightbulbIcon aria-hidden="true" className="size-3.5" />
							Prompts
						</button>
						<button
							aria-label="Create video"
							className="prompt-send grid size-9 shrink-0 place-items-center rounded-md text-primary-foreground transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-40"
							disabled={!canSubmit}
							type="submit"
						>
							<ArrowUpIcon
								aria-hidden="true"
								className="size-4"
								strokeWidth={2.5}
							/>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
