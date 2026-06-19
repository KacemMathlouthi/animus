import type { ChatStatus } from "ai";
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
	return (
		<ResizablePanelGroup className="min-h-0 flex-1" orientation="horizontal">
			<ResizablePanel defaultSize="42%" minSize="20%">
				<ChatPanel
					messages={messages}
					onStop={onStop}
					onSubmit={onSubmit}
					respondToTool={respondToTool}
					status={status}
				/>
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize="58%" minSize="20%">
				<VisualizationPanel videoUrl={videoUrl} />
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
