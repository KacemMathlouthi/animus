import type { ChatStatus } from "ai";
import { useState } from "react";
import {
	PromptInput,
	PromptInputBody,
	PromptInputFooter,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
} from "@/components/ai-elements/prompt-input";

export function StudioPrompt({
	status,
	onSubmit,
	onStop,
	placeholder = "Describe what you want to explain…",
	className,
}: {
	status?: ChatStatus;
	onSubmit: (text: string) => void;
	onStop?: () => void;
	placeholder?: string;
	className?: string;
}) {
	const [text, setText] = useState("");

	const isGenerating = status === "submitted" || status === "streaming";

	const handleSubmit = (message: PromptInputMessage) => {
		// Don't send a new message while a response is still streaming.
		if (isGenerating) {
			return;
		}
		const value = message.text.replace(/(?:\r?\n)+$/u, "");
		if (!value.trim()) {
			return;
		}
		onSubmit(value);
		setText("");
	};

	return (
		<PromptInput className={className} onSubmit={handleSubmit}>
			<PromptInputBody>
				<PromptInputTextarea
					aria-label="Message the agent"
					onChange={(event) => setText(event.target.value)}
					placeholder={placeholder}
					value={text}
				/>
			</PromptInputBody>
			<PromptInputFooter>
				<PromptInputTools />
				<PromptInputSubmit
					disabled={!(isGenerating || text.trim())}
					onStop={onStop}
					status={status}
				/>
			</PromptInputFooter>
		</PromptInput>
	);
}
