import type { ChatStatus } from "ai";
import { BellIcon, TriangleAlertIcon, VideoOffIcon } from "lucide-react";
import { useState } from "react";
import { ShareCard } from "@/components/share-card";
import { Button } from "@/components/ui/button";
import { MorphLogo } from "@/features/studio/components/morph-logo";
import { VideoPlayer } from "@/features/studio/components/video-player";
import { useSignedMediaUrl } from "@/features/studio/hooks/use-signed-media-url";

function NotifyButton() {
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >(() =>
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
  );

  if (permission === "granted" || permission === "unsupported") {
    return null;
  }

  return (
    <Button
      onClick={() => {
        Notification.requestPermission().then(setPermission);
      }}
      size="sm"
      variant="outline"
    >
      <BellIcon data-icon="inline-start" />
      Notify me when it's ready
    </Button>
  );
}

function RenderingStage() {
  return (
    <div className="flex max-w-sm flex-col items-center gap-5 text-center">
      <MorphLogo className="h-28" />
      <div className="space-y-1.5">
        <p className="font-medium">Creating your explainer</p>
        <p className="text-muted-foreground text-sm">
          Once the video is ready, it will appear here. You can enable
          notifications to get an instant alert when it's time to watch.
        </p>
      </div>
      <NotifyButton />
    </div>
  );
}

/** Shown when there is no video and no turn running. Previously this panel
 * rendered "Creating your explainer" unconditionally, so it promised a video
 * that was never coming: after a turn was cut off, after a failed render, and
 * even on an empty conversation where nothing had been asked for yet. */
function IdleStage({ failed }: { failed: boolean }) {
  return (
    <div className="flex max-w-sm flex-col items-center gap-3 text-center">
      {failed ? (
        <TriangleAlertIcon className="size-8 text-destructive" />
      ) : (
        <VideoOffIcon className="size-8 text-muted-foreground" />
      )}
      <div className="space-y-1.5">
        <p className="font-medium">
          {failed ? "The turn stopped early" : "No video yet"}
        </p>
        <p className="text-muted-foreground text-sm">
          {failed
            ? "It ended before a video was produced. The chat has the details, and sending a message picks up where it left off."
            : "Ask for an explainer in the chat and the finished video lands here."}
        </p>
      </div>
    </div>
  );
}

export function VisualizationPanel({
  videoKey,
  title,
  seed,
  status,
  playToken = 0,
}: {
  videoKey?: string;
  title: string;
  /** Stable seed for the branded poster card (the conversation id). */
  seed: string;
  /** Drives what an empty panel says: a turn in flight is genuinely rendering,
   * anything else is not. */
  status: ChatStatus;
  playToken?: number;
}) {
  const { url } = useSignedMediaUrl(videoKey);
  const working = status === "submitted" || status === "streaming";

  let stage = <IdleStage failed={status === "error"} />;
  if (working) {
    stage = <RenderingStage />;
  }

  return (
    <div className="flex h-full flex-col bg-muted/30">
      {videoKey ? (
        <VideoPlayer
          playToken={playToken}
          poster={<ShareCard seed={seed} title={title} />}
          src={url}
          title={title}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center overflow-auto p-6">
          {stage}
        </div>
      )}
    </div>
  );
}
