import { FileCode2Icon, FilesIcon, FileTextIcon } from "lucide-react";
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
import {
	EditFileTool,
	ManimStep,
	RenderSceneTool,
	RunCommandTool,
} from "@/features/studio/components/tools/manim-tools";
import {
	WebFetchTool,
	WebSearchTool,
} from "@/features/studio/components/tools/web-research";
import type { AnimusUIMessage, RespondToTool } from "@/features/studio/types";
import { useSession } from "@/lib/auth-client";

/** New words fade in as they arrive, in order, at the provider's real stream
 * speed (no server-side pacing). stagger:0 is the key: each word's delay would
 * otherwise be index*stagger, which spreads a provider chunk's words across time
 * and lets a later chunk overtake an earlier one's tail — the out-of-order pop.
 * With stagger:0 every word in a chunk fades together, and chunks append in
 * order, so the reveal tracks the stream as a soft trailing fade. The short
 * duration keeps that fade from lingering once newer text lands.
 * Requires `streamdown/styles.css` (imported in index.css) for the keyframes. */
const STREAM_ANIMATION = {
	animation: "blurIn",
	duration: 200,
	easing: "ease-out",
	sep: "word",
	stagger: 0,
} as const;

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
	onOpenVideo,
}: {
	message: AnimusUIMessage;
	isStreaming?: boolean;
	respondToTool: RespondToTool;
	onOpenVideo?: (url: string) => void;
}) {
	if (message.role === "user") {
		return (
			<div className="flex items-start justify-end gap-3">
				<Message className="ml-0 max-w-[80%]" from="user">
					<MessageContent className="whitespace-pre-wrap break-words">
						{textOf(message)}
					</MessageContent>
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
									animated={STREAM_ANIMATION}
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

					if (part.type === "tool-webSearch") {
						if (part.state !== "input-streaming" && part.input) {
							return (
								<WebSearchTool
									input={part.input}
									key={part.toolCallId}
									output={
										part.state === "output-available" ? part.output : undefined
									}
								/>
							);
						}
						return <Shimmer key={part.toolCallId}>Searching the web…</Shimmer>;
					}

					if (part.type === "tool-webFetch") {
						if (part.state !== "input-streaming" && part.input) {
							return (
								<WebFetchTool
									input={part.input}
									key={part.toolCallId}
									output={
										part.state === "output-available" ? part.output : undefined
									}
								/>
							);
						}
						return <Shimmer key={part.toolCallId}>Reading pages…</Shimmer>;
					}

					if (part.type === "tool-writeFile") {
						if (part.state !== "input-streaming" && part.input) {
							return (
								<ManimStep
									detail={part.input.path}
									icon={<FileCode2Icon className="size-3.5" />}
									key={part.toolCallId}
									title="Wrote file"
								/>
							);
						}
						return <Shimmer key={part.toolCallId}>Writing a scene…</Shimmer>;
					}

					if (part.type === "tool-editFile") {
						if (part.state !== "input-streaming" && part.input) {
							return (
								<EditFileTool
									errorText={
										part.state === "output-error" ? part.errorText : undefined
									}
									failed={part.state === "output-error"}
									input={part.input}
									key={part.toolCallId}
								/>
							);
						}
						return <Shimmer key={part.toolCallId}>Editing a file…</Shimmer>;
					}

					if (part.type === "tool-readFile") {
						if (part.state !== "input-streaming" && part.input) {
							return (
								<ManimStep
									detail={part.input.path}
									icon={<FileTextIcon className="size-3.5" />}
									key={part.toolCallId}
									title="Read file"
								/>
							);
						}
						return <Shimmer key={part.toolCallId}>Reading a file…</Shimmer>;
					}

					if (part.type === "tool-listFiles") {
						if (part.state !== "input-streaming" && part.input) {
							return (
								<ManimStep
									detail={part.input.path}
									icon={<FilesIcon className="size-3.5" />}
									key={part.toolCallId}
									title="Listed files"
								/>
							);
						}
						return <Shimmer key={part.toolCallId}>Listing files…</Shimmer>;
					}

					if (part.type === "tool-runCommand") {
						if (part.state !== "input-streaming" && part.input) {
							return (
								<RunCommandTool
									input={part.input}
									key={part.toolCallId}
									output={
										part.state === "output-available" ? part.output : undefined
									}
								/>
							);
						}
						return <Shimmer key={part.toolCallId}>Running a command…</Shimmer>;
					}

					if (part.type === "tool-renderScene") {
						if (part.state === "output-available" && part.input) {
							return (
								<RenderSceneTool
									input={part.input}
									key={part.toolCallId}
									onOpen={onOpenVideo}
									output={part.output}
								/>
							);
						}
						if (part.state !== "input-streaming" && part.input) {
							return (
								<Shimmer key={part.toolCallId}>
									{`Rendering ${part.input.scene}…`}
								</Shimmer>
							);
						}
						return <Shimmer key={part.toolCallId}>Preparing render…</Shimmer>;
					}

					return null;
				})}
			</Message>
		</div>
	);
}
