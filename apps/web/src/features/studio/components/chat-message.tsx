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
import {
	Source,
	Sources,
	SourcesContent,
	SourcesTrigger,
} from "@/components/ai-elements/sources";
import { LogoMark } from "@/components/brand/logo-mark";
import { UserAvatar } from "@/components/user-avatar";
import type { StudioMessage } from "@/features/studio/types";
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

export function ChatMessage({ message }: { message: StudioMessage }) {
	if (message.role === "user") {
		return (
			<div className="flex items-start justify-end gap-3">
				<Message className="ml-0 max-w-[80%]" from="user">
					<MessageContent>{message.text}</MessageContent>
				</Message>
				<MessageUserAvatar />
			</div>
		);
	}

	return (
		<div className="flex items-start gap-3">
			<AgentAvatar />
			<Message className="max-w-[80%] flex-1" from="assistant">
				{message.reasoning ? (
					<Reasoning>
						<ReasoningTrigger />
						<ReasoningContent>{message.reasoning}</ReasoningContent>
					</Reasoning>
				) : null}
				<MessageContent>
					<MessageResponse>{message.text}</MessageResponse>
				</MessageContent>
				{message.sources?.length ? (
					<Sources>
						<SourcesTrigger count={message.sources.length} />
						<SourcesContent>
							{message.sources.map((source) => (
								<Source
									href={source.href}
									key={source.href}
									title={source.title}
								/>
							))}
						</SourcesContent>
					</Sources>
				) : null}
			</Message>
		</div>
	);
}
