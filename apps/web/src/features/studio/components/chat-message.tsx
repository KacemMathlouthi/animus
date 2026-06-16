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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { StudioMessage } from "@/features/studio/types";
import { useSession } from "@/lib/auth-client";

function AgentAvatar() {
	return (
		<div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-card">
			<LogoMark className="h-5 w-auto" />
		</div>
	);
}

function UserAvatar() {
	const { data } = useSession();
	const user = data?.user;
	const name = user?.name?.trim() || user?.email || "You";
	return (
		<Avatar className="size-8 shrink-0 rounded-md after:rounded-md">
			<AvatarImage
				alt={name}
				className="rounded-md"
				src={user?.image ?? undefined}
			/>
			<AvatarFallback className="rounded-md">
				{name.charAt(0).toUpperCase()}
			</AvatarFallback>
		</Avatar>
	);
}

export function ChatMessage({ message }: { message: StudioMessage }) {
	if (message.role === "user") {
		return (
			<div className="flex items-start justify-end gap-3">
				<Message className="ml-0 max-w-[80%]" from="user">
					<MessageContent>{message.text}</MessageContent>
				</Message>
				<UserAvatar />
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
