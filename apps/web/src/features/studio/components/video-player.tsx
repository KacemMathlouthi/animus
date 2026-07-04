import { PlayIcon } from "lucide-react";
import type { ReactNode } from "react";
import { VideoControlBar } from "@/features/studio/components/video-control-bar";
import { useVideoPlayer } from "@/features/studio/hooks/use-video-player";

/** A video player styled to the app's UI that fills its container. Native
 * controls are replaced with a custom overlay (play/pause, scrubber, time,
 * mute, speed, fullscreen). The overlay and cursor auto-hide after a moment of
 * inactivity while playing and reappear on pointer/keyboard activity. Keyboard:
 * space/k play-pause, ←/→ seek, ↑/↓ volume, m mute, f fullscreen.
 *
 * Takes an already-resolved `src` (a presigned URL) so the same player serves
 * both the authed studio and the public share page. */
export function VideoPlayer({
	src,
	title,
	playToken,
	poster,
}: {
	src: string | undefined;
	title: string;
	playToken: number;
	/** Resting overlay shown over the frame until the video first plays (e.g. the
	 * branded share card). Cleared on first play and when the source changes. */
	poster?: ReactNode;
}) {
	const player = useVideoPlayer({ src, playToken });

	return (
		<div
			aria-label={`Video player: ${title}`}
			className="group relative flex h-full w-full items-center justify-center overflow-hidden bg-muted outline-none data-[controls=false]:cursor-none"
			data-controls={player.controlsShown}
			onClick={player.handleClick}
			onKeyDown={player.handleKeyDown}
			onPointerLeave={player.handlePointerLeave}
			onPointerMove={player.registerActivity}
			ref={player.containerRef}
			role="application"
			// biome-ignore lint/a11y/noNoninteractiveTabindex: the media player is a keyboard-driven widget and must be focusable to receive shortcuts.
			tabIndex={0}
		>
			<video
				aria-label={title}
				className="h-full w-full object-contain"
				playsInline
				ref={player.videoRef}
				src={src}
			>
				<track kind="captions" />
			</video>

			{/* Branded resting poster, shown until the video first plays. */}
			{poster && !player.hasStarted ? (
				<div className="pointer-events-none absolute inset-0">{poster}</div>
			) : null}

			{/* Title, top gradient. Right padding clears the panel's Hide button. */}
			<div className="pointer-events-none absolute inset-x-0 top-0 bg-linear-to-b from-black/70 to-transparent px-5 pt-4 pb-12 opacity-0 transition-opacity group-data-[controls=true]:opacity-100">
				<p className="truncate pr-32 font-semibold text-white text-xl tracking-tight [text-shadow:0_1px_3px_rgb(0_0_0/0.5)]">
					{title}
				</p>
			</div>

			{/* Center play affordance while paused. */}
			{player.isPlaying ? null : (
				<button
					aria-label="Play"
					className="absolute flex size-16 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-transform hover:scale-105"
					onClick={player.togglePlay}
					type="button"
				>
					<PlayIcon className="size-7 fill-white" />
				</button>
			)}

			<VideoControlBar
				currentTime={player.currentTime}
				duration={player.duration}
				isFullscreen={player.isFullscreen}
				isPlaying={player.isPlaying}
				muted={player.muted}
				onChangeRate={player.changeRate}
				onSeek={player.seekTo}
				onToggleFullscreen={player.toggleFullscreen}
				onToggleMute={player.toggleMute}
				onTogglePlay={player.togglePlay}
				rate={player.rate}
				seekable={player.seekable}
			/>
		</div>
	);
}
