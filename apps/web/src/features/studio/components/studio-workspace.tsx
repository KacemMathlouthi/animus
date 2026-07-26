import type { ChatStatus } from "ai";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ChatPanel } from "@/features/studio/components/chat-panel";
import { VisualizationPanel } from "@/features/studio/components/visualization-panel";
import type { AnimusUIMessage, RespondToTool } from "@/features/studio/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function StudioWorkspace({
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
  const isMobile = useIsMobile();
  const videoPanelRef = useRef<PanelImperativeHandle>(null);
  const [isVideoCollapsed, setIsVideoCollapsed] = useState(false);
  // On phones the two panels can't sit side by side; a single view swaps between
  // them instead of resizing.
  const [mobileView, setMobileView] = useState<"chat" | "video">("chat");
  // A video pinned by clicking its chat card; falls back to the latest render.
  // Clear the pin when a newer render lands (previous-value pattern, not an
  // effect) so the panel follows the latest again.
  const [pinnedVideoKey, setPinnedVideoKey] = useState<string>();
  const [lastVideoKey, setLastVideoKey] = useState(videoKey);
  if (videoKey !== lastVideoKey) {
    setLastVideoKey(videoKey);
    setPinnedVideoKey(undefined);
  }
  // Bumped on each chat-card click so the panel autoplays that video.
  const [playToken, setPlayToken] = useState(0);

  const toggleVideoPanel = () => {
    const panel = videoPanelRef.current;
    if (!panel) {
      return;
    }

    if (isVideoCollapsed) {
      panel.expand();
      setIsVideoCollapsed(false);
      return;
    }

    panel.collapse();
    setIsVideoCollapsed(true);
  };

  const openVideo = useCallback((key: string) => {
    setPinnedVideoKey(key);
    setPlayToken((token) => token + 1);
    setMobileView("video");
    videoPanelRef.current?.expand();
    setIsVideoCollapsed(false);
  }, []);

  const chatPanel = (
    <ChatPanel
      error={error}
      messages={messages}
      onOpenVideo={openVideo}
      onRetry={onRetry}
      onStop={onStop}
      onSubmit={onSubmit}
      respondToTool={respondToTool}
      status={status}
    />
  );

  const visualizationPanel = (
    <VisualizationPanel
      playToken={playToken}
      seed={seed}
      title={title}
      videoKey={pinnedVideoKey ?? videoKey}
    />
  );

  if (isMobile) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-1 border-b p-1.5">
          <Button
            className="h-11 flex-1"
            onClick={() => setMobileView("chat")}
            size="sm"
            variant={mobileView === "chat" ? "secondary" : "ghost"}
          >
            Chat
          </Button>
          <Button
            className="h-11 flex-1"
            onClick={() => setMobileView("video")}
            size="sm"
            variant={mobileView === "video" ? "secondary" : "ghost"}
          >
            Video
          </Button>
        </div>
        <div className="relative min-h-0 flex-1">
          <div className={cn("h-full", mobileView === "chat" ? "" : "hidden")}>
            {chatPanel}
          </div>
          <div className={cn("h-full", mobileView === "video" ? "" : "hidden")}>
            {visualizationPanel}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      className="relative min-h-0 flex-1"
      orientation="horizontal"
    >
      {isVideoCollapsed ? (
        <Button
          aria-label="Show video panel"
          className="absolute top-3 right-8 z-20 shadow-sm"
          onClick={toggleVideoPanel}
          size="sm"
          variant="outline"
        >
          <PanelRightOpen data-icon="inline-start" />
          Show video
        </Button>
      ) : null}
      <ResizablePanel defaultSize={50} minSize={35}>
        {chatPanel}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        collapsedSize={0}
        collapsible
        defaultSize={50}
        minSize={20}
        onResize={() =>
          setIsVideoCollapsed(videoPanelRef.current?.isCollapsed() ?? false)
        }
        panelRef={videoPanelRef}
      >
        <div className="relative h-full">
          <Button
            aria-label="Hide video panel"
            className="absolute top-3 right-3 z-20 shadow-sm"
            onClick={toggleVideoPanel}
            size="sm"
            variant="outline"
          >
            <PanelRightClose data-icon="inline-start" />
            Hide video
          </Button>
          {visualizationPanel}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
