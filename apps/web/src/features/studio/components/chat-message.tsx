import type { UIMessage } from "ai";
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
import { LogoMark } from "@/components/brand/logo-mark";
import { UserAvatar } from "@/components/user-avatar";
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

/** Concatenate all parts of a given kind into a single string. */
function partsOf(message: UIMessage, kind: "text" | "reasoning"): string {
	let out = "";
	for (const part of message.parts) {
		if (part.type === kind) {
			out += part.text;
		}
	}
	return out;
}

export function ChatMessage({
	message,
	isStreaming = false,
}: {
	message: UIMessage;
	isStreaming?: boolean;
}) {
	const text = partsOf(message, "text");

	if (message.role === "user") {
		return (
			<div className="flex items-start justify-end gap-3">
				<Message className="ml-0 max-w-[80%]" from="user">
					<MessageContent>{text}</MessageContent>
				</Message>
				<MessageUserAvatar />
			</div>
		);
	}

	const reasoning = partsOf(message, "reasoning");

	return (
		<div className="flex items-start gap-3">
			<AgentAvatar />
			<Message className="max-w-[80%] flex-1" from="assistant">
				{reasoning ? (
					<Reasoning>
						<ReasoningTrigger />
						<ReasoningContent>{reasoning}</ReasoningContent>
					</Reasoning>
				) : null}
				<MessageContent>
					<MessageResponse isAnimating={isStreaming}>{text}</MessageResponse>
				</MessageContent>
			</Message>
		</div>
	);
}
