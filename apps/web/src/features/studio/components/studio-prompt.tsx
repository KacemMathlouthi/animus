import type { ChatStatus } from "ai";
import { GlobeIcon } from "lucide-react";
import { useState } from "react";
import {
	PromptInput,
	PromptInputActionAddAttachments,
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	PromptInputActionMenuTrigger,
	PromptInputBody,
	PromptInputButton,
	PromptInputFooter,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
} from "@/components/ai-elements/prompt-input";

export function StudioPrompt({
	status,
	onSubmit,
	placeholder = "Describe what you want to explain…",
	className,
}: {
	status?: ChatStatus;
	onSubmit: (text: string) => void;
	placeholder?: string;
	className?: string;
}) {
	const [text, setText] = useState("");
	const [research, setResearch] = useState(true);

	const handleSubmit = (message: PromptInputMessage) => {
		const value = message.text.trim();
		if (!value) {
			return;
		}
		onSubmit(value);
		setText("");
	};

	return (
		<PromptInput
			className={className}
			globalDrop
			multiple
			onSubmit={handleSubmit}
		>
			<PromptInputBody>
				<PromptInputTextarea
					onChange={(event) => setText(event.target.value)}
					placeholder={placeholder}
					value={text}
				/>
			</PromptInputBody>
			<PromptInputFooter>
				<PromptInputTools>
					<PromptInputActionMenu>
						<PromptInputActionMenuTrigger />
						<PromptInputActionMenuContent>
							<PromptInputActionAddAttachments />
						</PromptInputActionMenuContent>
					</PromptInputActionMenu>
					<PromptInputButton
						onClick={() => setResearch((value) => !value)}
						variant={research ? "default" : "ghost"}
					>
						<GlobeIcon />
						<span>Research</span>
					</PromptInputButton>
				</PromptInputTools>
				<PromptInputSubmit disabled={!text.trim()} status={status} />
			</PromptInputFooter>
		</PromptInput>
	);
}
