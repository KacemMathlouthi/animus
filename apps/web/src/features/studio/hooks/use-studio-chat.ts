import type { ChatStatus } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	createAssistantMessage,
	createUserMessage,
} from "@/features/studio/data";
import type {
	RenderStatus,
	StudioMessage,
	StudioPhase,
} from "@/features/studio/types";

type StudioChatOptions = {
	/** Preloaded messages for an existing conversation (opens straight to chat). */
	initialMessages?: StudioMessage[];
	/** A prompt to auto-run on mount (a freshly created conversation). */
	initialPrompt?: string;
};

function resolveInitialPhase(options: StudioChatOptions): StudioPhase {
	if (options.initialMessages) {
		return "chat";
	}
	if (options.initialPrompt) {
		return "loading";
	}
	return "idle";
}

/**
 * Local, mocked studio session. Models the phases of a real flow — boot the
 * workspace (loading), then chat while the first render runs — so the UI's
 * transitions and loading/ready states are exercised without a backend (v1).
 */
export function useStudioChat(options: StudioChatOptions = {}) {
	const { initialMessages, initialPrompt } = options;

	const [phase, setPhase] = useState<StudioPhase>(() =>
		resolveInitialPhase(options),
	);
	const [messages, setMessages] = useState<StudioMessage[]>(
		initialMessages ?? [],
	);
	const [status, setStatus] = useState<ChatStatus>("ready");
	const [renderStatus, setRenderStatus] = useState<RenderStatus>(
		initialMessages ? "ready" : "rendering",
	);
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
	const phaseRef = useRef(phase);

	useEffect(() => {
		phaseRef.current = phase;
	}, [phase]);

	useEffect(
		() => () => {
			for (const timer of timers.current) {
				clearTimeout(timer);
			}
		},
		[],
	);

	// Boot a freshly created conversation from its first prompt. Self-contained
	// (owns its timers + cleanup) so it stays correct under StrictMode remounts.
	useEffect(() => {
		if (!initialPrompt) {
			return;
		}
		setPhase("loading");
		setRenderStatus("rendering");
		const toChat = setTimeout(() => {
			setMessages([
				createUserMessage(initialPrompt),
				createAssistantMessage(initialPrompt),
			]);
			setStatus("ready");
			setPhase("chat");
		}, 9000);
		const toReady = setTimeout(() => setRenderStatus("ready"), 24_000);
		return () => {
			clearTimeout(toChat);
			clearTimeout(toReady);
		};
	}, [initialPrompt]);

	// Follow-up message inside an active session.
	const send = useCallback((text: string) => {
		const value = text.trim();
		if (!value || phaseRef.current !== "chat") {
			return;
		}
		setMessages((prev) => [...prev, createUserMessage(value)]);
		setStatus("submitted");
		setRenderStatus("rendering");
		timers.current.push(
			setTimeout(() => {
				setStatus("streaming");
				setMessages((prev) => [...prev, createAssistantMessage(value)]);
			}, 700),
		);
		timers.current.push(setTimeout(() => setStatus("ready"), 1700));
		timers.current.push(setTimeout(() => setRenderStatus("ready"), 12_000));
	}, []);

	return { phase, messages, status, renderStatus, send };
}
