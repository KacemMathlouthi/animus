import { BellIcon, PlayIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MorphLogo } from "@/features/studio/components/morph-logo";

type RenderStatus = "rendering" | "ready";

function NotifyButton() {
	const [permission, setPermission] = useState<
		NotificationPermission | "unsupported"
	>(() =>
		typeof window !== "undefined" && "Notification" in window
			? Notification.permission
			: "unsupported",
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
				<p className="font-medium">Rendering your explainer</p>
				<p className="text-muted-foreground text-sm">
					This might take a few minutes. Feel free to leave and come back —
					we'll keep working and have it ready for you.
				</p>
			</div>
			<NotifyButton />
		</div>
	);
}

function VideoPreview() {
	return (
		<div className="w-full max-w-3xl space-y-3">
			<div className="group relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border bg-gradient-to-br from-secondary to-muted shadow-sm">
				<Button
					aria-label="Play preview"
					className="size-14 rounded-full"
					size="icon-lg"
				>
					<PlayIcon className="size-6" />
				</Button>
			</div>
			<div className="flex items-center justify-between px-1">
				<p className="font-medium text-sm">Untitled explainer</p>
				<p className="text-muted-foreground text-xs">4 scenes · 0:42</p>
			</div>
		</div>
	);
}

export function VisualizationPanel({
	renderStatus,
}: {
	renderStatus: RenderStatus;
}) {
	return (
		<div className="flex h-full flex-col bg-muted/30">
			<div className="flex flex-1 items-center justify-center overflow-auto p-6">
				{renderStatus === "ready" ? <VideoPreview /> : <RenderingStage />}
			</div>
		</div>
	);
}
