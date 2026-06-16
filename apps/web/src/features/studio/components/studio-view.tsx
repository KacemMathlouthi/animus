import type { ChatStatus } from "ai";
import { useEffect, useRef } from "react";
import { StudioEmptyState } from "@/features/studio/components/studio-empty-state";
import { StudioLoading } from "@/features/studio/components/studio-loading";
import { StudioWorkspace } from "@/features/studio/components/studio-workspace";
import type {
	RenderStatus,
	StudioMessage,
	StudioPhase,
} from "@/features/studio/types";

/**
 * Notify the user when a render finishes while they're on another tab —
 * the "leave and come back" promise from the render panel.
 */
function useRenderNotification(renderStatus: RenderStatus) {
	const previous = useRef(renderStatus);

	useEffect(() => {
		const finished =
			previous.current === "rendering" && renderStatus === "ready";
		previous.current = renderStatus;

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
	}, [renderStatus]);
}

export function StudioStage({
	phase,
	messages,
	status,
	renderStatus,
	onSubmit,
}: {
	phase: StudioPhase;
	messages: StudioMessage[];
	status: ChatStatus;
	renderStatus: RenderStatus;
	onSubmit: (text: string) => void;
}) {
	useRenderNotification(renderStatus);

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
					renderStatus={renderStatus}
					status={status}
				/>
			) : null}
		</>
	);
}
