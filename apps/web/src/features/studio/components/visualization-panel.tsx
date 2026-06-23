import { BellIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
					Once the video is ready, it will appear here. You can enable
					notifications to get an instant alert when it's time to watch.
				</p>
			</div>
			<NotifyButton />
		</div>
	);
}

function VideoPreview({
	url,
	title,
	playToken,
}: {
	url: string;
	title: string;
	playToken: number;
}) {
	const videoRef = useRef<HTMLVideoElement>(null);

	// Autoplay when the user opens a video from a chat card (playToken bumps on
	// each click). Skip the initial mount so the panel doesn't autoplay on load.
	useEffect(() => {
		if (playToken > 0) {
			videoRef.current?.play().catch(() => {
				// Autoplay can be blocked; the controls let the user start it.
			});
		}
	}, [playToken]);

	return (
		<div className="w-full max-w-3xl space-y-3">
			<div className="overflow-hidden rounded-xl border shadow-sm">
				{/* biome-ignore lint/a11y/useMediaCaption: Captions will be wired once the render pipeline produces a captions file. */}
				<video
					className="aspect-video w-full bg-black"
					controls
					ref={videoRef}
					src={url}
				/>
			</div>
			<p className="px-1 font-medium text-sm">{title}</p>
		</div>
	);
}

export function VisualizationPanel({
	videoUrl,
	title,
	playToken = 0,
}: {
	videoUrl?: string;
	title: string;
	playToken?: number;
}) {
	return (
		<div className="flex h-full flex-col bg-muted/30">
			<div className="flex flex-1 items-center justify-center overflow-auto p-6">
				{videoUrl ? (
					<VideoPreview playToken={playToken} title={title} url={videoUrl} />
				) : (
					<RenderingStage />
				)}
			</div>
		</div>
	);
}
