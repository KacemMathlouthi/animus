import type { ChatStatus } from "ai";
import { RotateCcwIcon } from "lucide-react";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/features/studio/components/chat-message";
import { StudioPrompt } from "@/features/studio/components/studio-prompt";
import type { AnimusUIMessage, RespondToTool } from "@/features/studio/types";

export function ChatPanel({
	messages,
	status,
	respondToTool,
	onSubmit,
	onStop,
	onOpenVideo,
	error,
	onRetry,
}: {
	messages: AnimusUIMessage[];
	status: ChatStatus;
	respondToTool: RespondToTool;
	onSubmit: (text: string) => void;
	onStop: () => void;
	onOpenVideo?: (key: string) => void;
	error?: Error;
	onRetry?: () => void;
}) {
	const lastIndex = messages.length - 1;
	return (
		<div className="flex h-full flex-col">
			<Conversation className="flex-1">
				<ConversationContent className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6">
					{messages.map((message, index) => (
						<ChatMessage
							isStreaming={
								status === "streaming" &&
								index === lastIndex &&
								message.role === "assistant"
							}
							key={message.id}
							message={message}
							onOpenVideo={onOpenVideo}
							respondToTool={respondToTool}
						/>
					))}
					{status === "submitted" ? (
						<Shimmer>Thinking through the explanation…</Shimmer>
					) : null}
					{status === "error" ? (
						<div
							className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm"
							role="alert"
						>
							<span className="text-destructive">
								{error?.message ||
									"Something went wrong while generating. Try again."}
							</span>
							{onRetry ? (
								<Button onClick={onRetry} size="sm" variant="outline">
									<RotateCcwIcon data-icon="inline-start" />
									Retry
								</Button>
							) : null}
						</div>
					) : null}
				</ConversationContent>
				<ConversationScrollButton />
			</Conversation>
			<div className="shrink-0 border-t p-3">
				<div className="mx-auto w-full max-w-2xl">
					<StudioPrompt
						onStop={onStop}
						onSubmit={onSubmit}
						placeholder="Ask for a change, or describe the next scene…"
						status={status}
					/>
				</div>
			</div>
		</div>
	);
}
