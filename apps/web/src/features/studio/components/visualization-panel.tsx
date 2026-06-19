import { BellIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MorphLogo } from "@/features/studio/components/morph-logo";

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

function VideoPreview({ url }: { url: string }) {
	return (
		<div className="w-full max-w-3xl space-y-3">
			<div className="overflow-hidden rounded-xl border shadow-sm">
				<video className="aspect-video w-full bg-black" controls src={url}>
					<track kind="captions" />
				</video>
			</div>
			<p className="px-1 font-medium text-sm">Untitled explainer</p>
		</div>
	);
}

export function VisualizationPanel({ videoUrl }: { videoUrl?: string }) {
	return (
		<div className="flex h-full flex-col bg-muted/30">
			<div className="flex flex-1 items-center justify-center overflow-auto p-6">
				{videoUrl ? <VideoPreview url={videoUrl} /> : <RenderingStage />}
			</div>
		</div>
	);
}
