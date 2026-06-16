import type { ChatStatus } from "ai";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ChatMessage } from "@/features/studio/components/chat-message";
import { StudioPrompt } from "@/features/studio/components/studio-prompt";
import type { StudioMessage } from "@/features/studio/types";

export function ChatPanel({
	messages,
	status,
	onSubmit,
}: {
	messages: StudioMessage[];
	status: ChatStatus;
	onSubmit: (text: string) => void;
}) {
	return (
		<div className="flex h-full flex-col">
			<Conversation className="flex-1">
				<ConversationContent className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6">
					{messages.map((message) => (
						<ChatMessage key={message.id} message={message} />
					))}
					{status === "submitted" ? (
						<Shimmer>Thinking through the explanation…</Shimmer>
					) : null}
				</ConversationContent>
				<ConversationScrollButton />
			</Conversation>
			<div className="shrink-0 border-t p-3">
				<div className="mx-auto w-full max-w-2xl">
					<StudioPrompt
						onSubmit={onSubmit}
						placeholder="Ask for a change, or describe the next scene…"
						status={status}
					/>
				</div>
			</div>
		</div>
	);
}
