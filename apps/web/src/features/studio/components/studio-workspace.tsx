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

export function StudioWorkspace({
	messages,
	status,
	videoUrl,
	title,
	respondToTool,
	onSubmit,
	onStop,
}: {
	messages: AnimusUIMessage[];
	status: ChatStatus;
	videoUrl?: string;
	title: string;
	respondToTool: RespondToTool;
	onSubmit: (text: string) => void;
	onStop: () => void;
}) {
	const videoPanelRef = useRef<PanelImperativeHandle>(null);
	const [isVideoCollapsed, setIsVideoCollapsed] = useState(false);
	// A video pinned by clicking its chat card; falls back to the latest render.
	// Clear the pin whenever a newer render lands so the panel follows the latest
	// again — done during render (the previous-value pattern) to avoid an effect.
	const [pinnedVideoUrl, setPinnedVideoUrl] = useState<string>();
	const [lastVideoUrl, setLastVideoUrl] = useState(videoUrl);
	if (videoUrl !== lastVideoUrl) {
		setLastVideoUrl(videoUrl);
		setPinnedVideoUrl(undefined);
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

	const openVideo = useCallback((url: string) => {
		setPinnedVideoUrl(url);
		setPlayToken((token) => token + 1);
		videoPanelRef.current?.expand();
		setIsVideoCollapsed(false);
	}, []);

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
				<ChatPanel
					messages={messages}
					onOpenVideo={openVideo}
					onStop={onStop}
					onSubmit={onSubmit}
					respondToTool={respondToTool}
					status={status}
				/>
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
					<VisualizationPanel
						playToken={playToken}
						title={title}
						videoUrl={pinnedVideoUrl ?? videoUrl}
					/>
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
