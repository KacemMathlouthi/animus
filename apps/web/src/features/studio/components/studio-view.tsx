import type { ChatStatus } from "ai";
import { useEffect, useRef } from "react";
import { StudioEmptyState } from "@/features/studio/components/studio-empty-state";
import { StudioLoading } from "@/features/studio/components/studio-loading";
import { StudioWorkspace } from "@/features/studio/components/studio-workspace";
import type {
	AnimusUIMessage,
	RespondToTool,
	StudioPhase,
} from "@/features/studio/types";

/**
 * Notify the user when the explainer finishes (a video URL appears) while
 * they're on another tab — the "leave and come back" promise from the panel.
 */
function useRenderNotification(videoUrl: string | undefined) {
	const previous = useRef(videoUrl);

	useEffect(() => {
		const finished = !previous.current && Boolean(videoUrl);
		previous.current = videoUrl;

		if (
			finished &&
			typeof window !== "undefined" &&
			"Notification" in window &&
			Notification.permission === "granted" &&
			document.hidden
		) {
			const notification = new Notification("Your explainer is ready", {
				body: "animus finished rendering your video.",
				icon: "/logo.svg",
			});
			notification.onclick = () => window.focus();
		}
	}, [videoUrl]);
}

export function StudioStage({
	phase,
	messages,
	status,
	videoUrl,
	respondToTool,
	onSubmit,
}: {
	phase: StudioPhase;
	messages: AnimusUIMessage[];
	status: ChatStatus;
	videoUrl?: string;
	respondToTool: RespondToTool;
	onSubmit: (text: string) => void;
}) {
	useRenderNotification(videoUrl);

	return (
		<>
			{phase === "idle" ? (
				<StudioEmptyState onSubmit={onSubmit} status={status} />
			) : null}
			{phase === "loading" ? <StudioLoading /> : null}
			{phase === "chat" ? (
				<StudioWorkspace
					messages={messages}
					onSubmit={onSubmit}
					respondToTool={respondToTool}
					status={status}
					videoUrl={videoUrl}
				/>
			) : null}
		</>
	);
}
