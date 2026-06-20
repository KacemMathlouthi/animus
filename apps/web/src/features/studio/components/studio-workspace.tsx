import type { ChatStatus } from "ai";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useRef, useState } from "react";
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
	respondToTool,
	onSubmit,
	onStop,
}: {
	messages: AnimusUIMessage[];
	status: ChatStatus;
	videoUrl?: string;
	respondToTool: RespondToTool;
	onSubmit: (text: string) => void;
	onStop: () => void;
}) {
	const videoPanelRef = useRef<PanelImperativeHandle>(null);
	const [isVideoCollapsed, setIsVideoCollapsed] = useState(false);

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
						className="absolute top-3 left-3 z-20 shadow-sm"
						onClick={toggleVideoPanel}
						size="sm"
						variant="outline"
					>
						<PanelRightClose data-icon="inline-start" />
						Hide video
					</Button>
					<VisualizationPanel videoUrl={videoUrl} />
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
