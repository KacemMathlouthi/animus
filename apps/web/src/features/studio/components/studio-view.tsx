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

/** Notify the user when the explainer finishes while they're on another tab —
 * the "leave and come back" promise from the panel. */
function useRenderNotification(videoKey: string | undefined) {
  const previous = useRef(videoKey);

  useEffect(() => {
    const finished = !previous.current && Boolean(videoKey);
    previous.current = videoKey;

    if (
      finished &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted" &&
      document.hidden
    ) {
      const notification = new Notification("Your explainer is ready", {
        body: "Your video is ready to watch.",
        icon: "/logo.svg",
      });
      notification.onclick = () => window.focus();
    }
  }, [videoKey]);
}

export function StudioStage({
  phase,
  messages,
  status,
  videoKey,
  title,
  seed,
  respondToTool,
  onSubmit,
  onStop,
  error,
  onRetry,
}: {
  phase: StudioPhase;
  messages: AnimusUIMessage[];
  status: ChatStatus;
  videoKey?: string;
  title: string;
  seed: string;
  respondToTool: RespondToTool;
  onSubmit: (text: string) => void;
  onStop: () => void;
  error?: Error;
  onRetry?: () => void;
}) {
  useRenderNotification(videoKey);

  return (
    <>
      {phase === "idle" ? (
        <StudioEmptyState onSubmit={onSubmit} status={status} />
      ) : null}
      {phase === "loading" ? <StudioLoading /> : null}
      {phase === "chat" ? (
        <StudioWorkspace
          error={error}
          messages={messages}
          onRetry={onRetry}
          onStop={onStop}
          onSubmit={onSubmit}
          respondToTool={respondToTool}
          seed={seed}
          status={status}
          title={title}
          videoKey={videoKey}
        />
      ) : null}
    </>
  );
}
