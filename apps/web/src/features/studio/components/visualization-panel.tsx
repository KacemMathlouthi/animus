import type { ChatStatus } from "ai";
import { BellIcon, TriangleAlertIcon } from "lucide-react";
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

/** Shown when the turn ended in an error. Everything else keeps the animated
 * RenderingStage: this panel only mounts once a conversation has messages, and
 * `ready` is the ordinary between-turns state (waiting on plan approval, the
 * agent asking a question), where a video is still genuinely coming. Only a
 * turn that actually failed should stop promising one. */
function StoppedStage() {
  return (
    <div className="flex max-w-sm flex-col items-center gap-3 text-center">
      <TriangleAlertIcon className="size-8 text-destructive" />
      <div className="space-y-1.5">
        <p className="font-medium">The turn stopped early</p>
        <p className="text-muted-foreground text-sm">
          It ended before a video was produced. The chat has the details, and
          sending a message picks up where it left off.
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
  /** Only "error" changes what an empty panel says; every other status keeps
   * the rendering animation. */
  status: ChatStatus;
  playToken?: number;
}) {
  const { url } = useSignedMediaUrl(videoKey);

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
          {status === "error" ? <StoppedStage /> : <RenderingStage />}
        </div>
      )}
    </div>
  );
}
