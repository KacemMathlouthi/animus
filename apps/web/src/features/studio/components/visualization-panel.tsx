import { BellIcon } from "lucide-react";
import { useState } from "react";
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
					Once the video is ready, it will appear here. You can enable
					notifications to get an instant alert when it's time to watch.
				</p>
			</div>
			<NotifyButton />
		</div>
	);
}

export function VisualizationPanel({
	videoKey,
	title,
	playToken = 0,
}: {
	videoKey?: string;
	title: string;
	playToken?: number;
}) {
	const { url } = useSignedMediaUrl(videoKey);
	return (
		<div className="flex h-full flex-col bg-muted/30">
			{videoKey ? (
				<VideoPlayer playToken={playToken} src={url} title={title} />
			) : (
				<div className="flex flex-1 items-center justify-center overflow-auto p-6">
					<RenderingStage />
				</div>
			)}
		</div>
	);
}
