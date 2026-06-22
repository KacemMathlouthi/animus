import { useChat } from "@ai-sdk/react";
import {
	type ChatStatus,
	lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
	AnimusUIMessage,
	RespondToTool,
	StudioPhase,
} from "@/features/studio/types";
import { chatTransport } from "@/lib/chat";

type StudioChat = {
	messages: AnimusUIMessage[];
	status: ChatStatus;
	phase: StudioPhase;
	/** Rendered explainer URL, once the render loop produces one. Undefined until
	 * then — the side panel keeps animating while it's absent. */
	videoUrl?: string;
	send: (text: string) => void;
	stop: () => void;
	respondToTool: RespondToTool;
};

/**
 * The studio's chat session, backed by the real streaming /api/chat endpoint.
 * Keyed by chatId so each conversation has its own state; an optional initial
 * prompt (a freshly created conversation) is sent once on mount.
 *
 * Interactive (human-in-the-loop) tool calls pause the agent until the user
 * answers in the UI; `respondToTool` sends the answer back, and
 * `sendAutomaticallyWhen` resubmits so the agent continues.
 */
export function useStudioChat({
	chatId,
	initialPrompt,
	initialMessages,
	onConversationUpdated,
}: {
	chatId: string;
	initialPrompt?: string;
	initialMessages?: AnimusUIMessage[];
	onConversationUpdated?: () => void;
}): StudioChat {
	const { messages, sendMessage, status, addToolOutput, stop } =
		useChat<AnimusUIMessage>({
			id: chatId,
			messages: initialMessages,
			transport: chatTransport,
			sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
			onFinish: () => {
				onConversationUpdated?.();
			},
		});

	// Auto-run the first prompt exactly once for a new conversation.
	const autoSent = useRef(false);
	const [initialSendFailed, setInitialSendFailed] = useState(false);
	useEffect(() => {
		if (initialPrompt && !autoSent.current) {
			autoSent.current = true;
			setInitialSendFailed(false);
			void sendMessage({ text: initialPrompt }).catch(() => {
				autoSent.current = false;
				setInitialSendFailed(true);
			});
		}
	}, [initialPrompt, sendMessage]);

	const send = useCallback(
		(text: string) => {
			void sendMessage({ text });
		},
		[sendMessage],
	);

	const respondToTool = useCallback<RespondToTool>(
		(tool, toolCallId, output) => {
			// tool ↔ output correspond at every call site; the union widening here is
			// the only thing the typed signature can't prove.
			addToolOutput({ tool, toolCallId, output } as never);
		},
		[addToolOutput],
	);

	const hasMessages = messages.length > 0;
	const hasAssistant = messages.some((message) => message.role === "assistant");
	const working = status === "submitted" || status === "streaming";

	let phase: StudioPhase;
	if (
		!hasAssistant &&
		(working || (initialPrompt != null && !hasMessages && !initialSendFailed))
	) {
		// Booting a fresh conversation, before the first assistant token.
		phase = "loading";
	} else if (hasMessages) {
		phase = "chat";
	} else {
		phase = "idle";
	}

	// No render pipeline yet, so there's never a video — the side panel animates
	// indefinitely. The render loop will populate this later.
	const videoUrl: string | undefined = undefined;

	return { messages, status, phase, videoUrl, send, stop, respondToTool };
}
