import {
	Message,
	MessageContent,
	MessageResponse,
} from "@/components/ai-elements/message";
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { LogoMark } from "@/components/brand/logo-mark";
import { UserAvatar } from "@/components/user-avatar";
import { AskUserQuestionTool } from "@/features/studio/components/tools/ask-user-question";
import { FinalizeVideoPlanTool } from "@/features/studio/components/tools/finalize-video-plan";
import type { AnimusUIMessage, RespondToTool } from "@/features/studio/types";
import { useSession } from "@/lib/auth-client";

function AgentAvatar() {
	return (
		<div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-card">
			<LogoMark className="h-5 w-auto" />
		</div>
	);
}

function MessageUserAvatar() {
	const { data } = useSession();
	const user = data?.user;
	return (
		<UserAvatar
			className="size-8 shrink-0"
			email={user?.email}
			image={user?.image}
			name={user?.name}
			square
		/>
	);
}

/** Concatenate all text parts (used for the plain user bubble). */
function textOf(message: AnimusUIMessage): string {
	let out = "";
	for (const part of message.parts) {
		if (part.type === "text") {
			out += part.text;
		}
	}
	return out;
}

export function ChatMessage({
	message,
	isStreaming = false,
	respondToTool,
}: {
	message: AnimusUIMessage;
	isStreaming?: boolean;
	respondToTool: RespondToTool;
}) {
	if (message.role === "user") {
		return (
			<div className="flex items-start justify-end gap-3">
				<Message className="ml-0 max-w-[80%]" from="user">
					<MessageContent>{textOf(message)}</MessageContent>
				</Message>
				<MessageUserAvatar />
			</div>
		);
	}

	// Render parts in their original order so text and interactive tools stay
	// interleaved exactly as the agent produced them.
	return (
		<div className="flex items-start gap-3">
			<AgentAvatar />
			<Message className="max-w-[80%] flex-1" from="assistant">
				{message.parts.map((part, index) => {
					// Append-only parts: index keys are stable here (parts never reorder).
					const key = `${message.id}-${index}`;

					if (part.type === "reasoning") {
						return part.text ? (
							<Reasoning key={key}>
								<ReasoningTrigger />
								<ReasoningContent>{part.text}</ReasoningContent>
							</Reasoning>
						) : null;
					}

					if (part.type === "text") {
						return part.text ? (
							<MessageContent key={key}>
								<MessageResponse
									isAnimating={isStreaming && part.state === "streaming"}
								>
									{part.text}
								</MessageResponse>
							</MessageContent>
						) : null;
					}

					if (part.type === "tool-askUserQuestion") {
						if (part.state !== "input-streaming" && part.input) {
							return (
								<AskUserQuestionTool
									input={part.input}
									key={part.toolCallId}
									onRespond={(output) =>
										respondToTool("askUserQuestion", part.toolCallId, output)
									}
									output={
										part.state === "output-available" ? part.output : undefined
									}
								/>
							);
						}
						return (
							<Shimmer key={part.toolCallId}>Preparing a question…</Shimmer>
						);
					}

					if (part.type === "tool-finalizeVideoPlan") {
						if (part.state !== "input-streaming" && part.input) {
							return (
								<FinalizeVideoPlanTool
									input={part.input}
									key={part.toolCallId}
									onRespond={(output) =>
										respondToTool("finalizeVideoPlan", part.toolCallId, output)
									}
									output={
										part.state === "output-available" ? part.output : undefined
									}
								/>
							);
						}
						return <Shimmer key={part.toolCallId}>Drafting a plan…</Shimmer>;
					}

					return null;
				})}
			</Message>
		</div>
	);
}
