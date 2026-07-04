import type { ChangeEvent, KeyboardEvent } from "react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { useStartConversation } from "@/features/studio/hooks/use-start-conversation";
import { useSession } from "@/lib/auth-client";
import { stashPendingPrompt } from "@/lib/pending-prompt";
import { cn } from "@/lib/utils";

const MAX_TEXTAREA_HEIGHT = 168;

/** Two rightward chevrons made of dots — the send arrow (see `.send-dot` in
 * index.css for the shimmer). `d` staggers each dot's wave. */
const SEND_DOTS = [
	{ cx: 2, cy: 2, d: 0 },
	{ cx: 5, cy: 5, d: 0.05 },
	{ cx: 8, cy: 8, d: 0.1 },
	{ cx: 5, cy: 11, d: 0.15 },
	{ cx: 2, cy: 14, d: 0.2 },
	{ cx: 6, cy: 2, d: 0.05 },
	{ cx: 9, cy: 5, d: 0.1 },
	{ cx: 12, cy: 8, d: 0.15 },
	{ cx: 9, cy: 11, d: 0.2 },
	{ cx: 6, cy: 14, d: 0.25 },
];

export function HeroPrompt({ className }: { className?: string }) {
	const { data: session } = useSession();
	const navigate = useNavigate();
	const { start, creating } = useStartConversation();
	const [text, setText] = useState("");

	// Grow the textarea with its content (up to a cap, then it scrolls). Driven off
	// the input event's element, which already carries the new value — no effect.
	const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
		setText(event.target.value);
		const el = event.target;
		el.style.height = "0px";
		el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
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
		<div className={cn("w-full max-w-xl", className)}>
			<form
				className="hero-prompt-frame flex items-center gap-2 rounded-2xl border-[2.5px] border-primary bg-card p-2"
				onSubmit={(event) => {
					event.preventDefault();
					submit(text);
				}}
			>
				<textarea
					aria-label="Describe what you want explained"
					className="min-h-11 flex-1 resize-none self-center bg-transparent px-2.5 py-2.5 text-base outline-none placeholder:text-muted-foreground"
					onChange={onChange}
					onKeyDown={onKeyDown}
					placeholder="Explain how…"
					rows={1}
					value={text}
				/>
				<button
					aria-label="Create video"
					className="send-btn grid size-9 shrink-0 place-items-center self-center rounded-[11px] bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-40"
					disabled={!canSubmit}
					type="submit"
				>
					<svg
						aria-hidden="true"
						className="overflow-visible"
						fill="currentColor"
						height="16"
						viewBox="0 0 14 16"
						width="14"
					>
						{SEND_DOTS.map((p) => (
							<circle
								className="send-dot"
								cx={p.cx}
								cy={p.cy}
								key={`${p.cx}-${p.cy}`}
								r="1"
								style={{ animationDelay: `${p.d}s` }}
							/>
						))}
					</svg>
				</button>
			</form>
		</div>
	);
}
