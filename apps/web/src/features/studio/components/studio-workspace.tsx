import type { ChatStatus } from "ai";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ChatPanel } from "@/features/studio/components/chat-panel";
import { VisualizationPanel } from "@/features/studio/components/visualization-panel";
import type { RenderStatus, StudioMessage } from "@/features/studio/types";

export function StudioWorkspace({
	messages,
	status,
	renderStatus,
	onSubmit,
}: {
	messages: StudioMessage[];
	status: ChatStatus;
	renderStatus: RenderStatus;
	onSubmit: (text: string) => void;
}) {
	return (
		<ResizablePanelGroup className="min-h-0 flex-1" orientation="horizontal">
			<ResizablePanel defaultSize="42%" minSize="20%">
				<ChatPanel messages={messages} onSubmit={onSubmit} status={status} />
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize="58%" minSize="20%">
				<VisualizationPanel renderStatus={renderStatus} />
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
