import { useChat } from "@ai-sdk/react";
import type { ChatStatus, UIMessage } from "ai";
import { useCallback, useEffect, useRef } from "react";
import type { StudioPhase } from "@/features/studio/types";
import { chatTransport } from "@/lib/chat";

type StudioChat = {
	messages: UIMessage[];
	status: ChatStatus;
	phase: StudioPhase;
	/** Rendered explainer URL, once the render loop produces one. Undefined until
	 * then — the side panel keeps animating while it's absent. */
	videoUrl?: string;
	send: (text: string) => void;
};

/**
 * The studio's chat session, backed by the real streaming /api/chat endpoint.
 * Keyed by chatId so each conversation has its own state; an optional initial
 * prompt (a freshly created conversation) is sent once on mount.
 *
 * Derives the full-screen `loading` phase (a new conversation booting, before
 * the first assistant token) from the chat lifecycle. `videoUrl` is the seam
 * for the not-yet-built render loop; while it's undefined the side panel keeps
 * its rendering animation running.
 */
export function useStudioChat({
	chatId,
	initialPrompt,
}: {
	chatId: string;
	initialPrompt?: string;
}): StudioChat {
	const { messages, sendMessage, status } = useChat({
		id: chatId,
		transport: chatTransport,
	});

	// Auto-run the first prompt exactly once for a new conversation.
	const autoSent = useRef(false);
	useEffect(() => {
		if (initialPrompt && !autoSent.current) {
			autoSent.current = true;
			void sendMessage({ text: initialPrompt });
		}
	}, [initialPrompt, sendMessage]);

	const send = useCallback(
		(text: string) => {
			void sendMessage({ text });
		},
		[sendMessage],
	);

	const hasMessages = messages.length > 0;
	const hasAssistant = messages.some((message) => message.role === "assistant");
	const working = status === "submitted" || status === "streaming";

	let phase: StudioPhase;
	if (!hasAssistant && (working || (initialPrompt != null && !hasMessages))) {
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

	return { messages, status, phase, videoUrl, send };
}
