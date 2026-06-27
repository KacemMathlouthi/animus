import * as SliderPrimitive from "@radix-ui/react-slider";
import {
	GaugeIcon,
	MaximizeIcon,
	MinimizeIcon,
	PauseIcon,
	PlayIcon,
	Volume2Icon,
	VolumeXIcon,
} from "lucide-react";
import {
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSignedMediaUrl } from "@/features/studio/hooks/use-signed-media-url";

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const SEEK_STEP_SEC = 5;
const VOLUME_STEP = 0.1;
const CONTROLS_HIDE_MS = 2500;

function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds)) {
		return "0:00";
	}
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

/** A video player styled to the app's UI that fills its container. Native
 * controls are replaced with a custom overlay (play/pause, scrubber, time,
 * mute, speed, fullscreen). The overlay and cursor auto-hide after a moment of
 * inactivity while playing and reappear on pointer/keyboard activity. Keyboard:
 * space/k play-pause, ←/→ seek, ↑/↓ volume, m mute, f fullscreen. */
export function VideoPlayer({
	videoKey,
	title,
	playToken,
}: {
	videoKey: string;
	title: string;
	playToken: number;
}) {
	const { url } = useSignedMediaUrl(videoKey);
	const containerRef = useRef<HTMLDivElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const hideTimerRef = useRef<number | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [muted, setMuted] = useState(false);
	const [rate, setRate] = useState(1);
	const [isFullscreen, setIsFullscreen] = useState(false);
	// Whether there's been recent activity; combined with isPlaying it decides
	// whether the overlay shows (always shown while paused).
	const [active, setActive] = useState(true);

	// Reflect the media element's own state back into React.
	useEffect(() => {
		const video = videoRef.current;
		if (!video) {
			return;
		}
		const onPlay = () => setIsPlaying(true);
		const onPause = () => setIsPlaying(false);
		const onTime = () => setCurrentTime(video.currentTime);
		const onDuration = () => setDuration(video.duration);
		const onVolume = () => setMuted(video.muted);
		const onRate = () => setRate(video.playbackRate);

		video.addEventListener("play", onPlay);
		video.addEventListener("pause", onPause);
		video.addEventListener("timeupdate", onTime);
		video.addEventListener("durationchange", onDuration);
		video.addEventListener("volumechange", onVolume);
		video.addEventListener("ratechange", onRate);
		return () => {
			video.removeEventListener("play", onPlay);
			video.removeEventListener("pause", onPause);
			video.removeEventListener("timeupdate", onTime);
			video.removeEventListener("durationchange", onDuration);
			video.removeEventListener("volumechange", onVolume);
			video.removeEventListener("ratechange", onRate);
		};
	}, []);

	// Autoplay when opened from a chat card (playToken bumps per click); skip the
	// initial mount so the panel doesn't autoplay on load.
	useEffect(() => {
		if (playToken > 0) {
			videoRef.current?.play().catch(() => {
				// Autoplay can be blocked; the controls remain available.
			});
		}
	}, [playToken]);

	// Fullscreen can change outside our button (Esc, F11) — keep the icon honest.
	useEffect(() => {
		const onChange = () =>
			setIsFullscreen(document.fullscreenElement === containerRef.current);
		document.addEventListener("fullscreenchange", onChange);
		return () => document.removeEventListener("fullscreenchange", onChange);
	}, []);

	// Mark activity and schedule the overlay to hide after a quiet moment.
	const registerActivity = useCallback(() => {
		setActive(true);
		if (hideTimerRef.current) {
			window.clearTimeout(hideTimerRef.current);
		}
		hideTimerRef.current = window.setTimeout(
			() => setActive(false),
			CONTROLS_HIDE_MS,
		);
	}, []);

	// Start the hide countdown when playback begins; keep the overlay pinned on
	// while paused.
	useEffect(() => {
		if (isPlaying) {
			registerActivity();
		} else {
			if (hideTimerRef.current) {
				window.clearTimeout(hideTimerRef.current);
			}
			setActive(true);
		}
	}, [isPlaying, registerActivity]);

	useEffect(
		() => () => {
			if (hideTimerRef.current) {
				window.clearTimeout(hideTimerRef.current);
			}
		},
		[],
	);

	const togglePlay = useCallback(() => {
		const video = videoRef.current;
		if (!video) {
			return;
		}
		if (video.paused) {
			video.play().catch(() => {
				// Ignore — a blocked play leaves the controls in place.
			});
		} else {
			video.pause();
		}
	}, []);

	const toggleMute = useCallback(() => {
		const video = videoRef.current;
		if (video) {
			video.muted = !video.muted;
		}
	}, []);

	const changeRate = useCallback((next: number) => {
		const video = videoRef.current;
		if (video) {
			video.playbackRate = next;
		}
	}, []);

	const seekBy = useCallback((delta: number) => {
		const video = videoRef.current;
		if (!video) {
			return;
		}
		const max = Number.isFinite(video.duration)
			? video.duration
			: video.currentTime + delta;
		video.currentTime = Math.min(Math.max(0, video.currentTime + delta), max);
	}, []);

	const changeVolume = useCallback((delta: number) => {
		const video = videoRef.current;
		if (!video) {
			return;
		}
		video.volume = Math.min(1, Math.max(0, video.volume + delta));
		if (video.volume > 0) {
			video.muted = false;
		}
	}, []);

	const toggleFullscreen = useCallback(() => {
		if (document.fullscreenElement) {
			document.exitFullscreen().catch(() => {
				// Ignore — exiting fullscreen is best-effort.
			});
		} else {
			containerRef.current?.requestFullscreen().catch(() => {
				// Ignore — fullscreen may be blocked by the browser.
			});
		}
	}, []);

	// Click the frame (video or letterbox) to toggle playback; clicks on the
	// controls have their own targets and fall through.
	const handleClick = useCallback(
		(event: ReactMouseEvent<HTMLDivElement>) => {
			if (
				event.target === videoRef.current ||
				event.target === containerRef.current
			) {
				togglePlay();
			}
		},
		[togglePlay],
	);

	const handleKeyDown = useCallback(
		(event: ReactKeyboardEvent<HTMLDivElement>) => {
			// Let a focused control handle space/enter itself.
			const onContainer = event.target === event.currentTarget;
			switch (event.key) {
				case " ":
				case "k":
					if (!onContainer) {
						return;
					}
					event.preventDefault();
					togglePlay();
					break;
				case "ArrowLeft":
					event.preventDefault();
					seekBy(-SEEK_STEP_SEC);
					break;
				case "ArrowRight":
					event.preventDefault();
					seekBy(SEEK_STEP_SEC);
					break;
				case "ArrowUp":
					event.preventDefault();
					changeVolume(VOLUME_STEP);
					break;
				case "ArrowDown":
					event.preventDefault();
					changeVolume(-VOLUME_STEP);
					break;
				case "m":
					toggleMute();
					break;
				case "f":
					toggleFullscreen();
					break;
				default:
					return;
			}
			registerActivity();
		},
		[
			togglePlay,
			seekBy,
			changeVolume,
			toggleMute,
			toggleFullscreen,
			registerActivity,
		],
	);

	const handlePointerLeave = useCallback(() => {
		if (videoRef.current && !videoRef.current.paused) {
			if (hideTimerRef.current) {
				window.clearTimeout(hideTimerRef.current);
			}
			setActive(false);
		}
	}, []);

	const seekable = duration > 0 && Number.isFinite(duration);
	const controlsShown = !isPlaying || active;

	return (
		<div
			aria-label={`Video player: ${title}`}
			className="group relative flex h-full w-full items-center justify-center overflow-hidden bg-muted outline-none data-[controls=false]:cursor-none"
			data-controls={controlsShown}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			onPointerLeave={handlePointerLeave}
			onPointerMove={registerActivity}
			ref={containerRef}
			role="application"
			// biome-ignore lint/a11y/noNoninteractiveTabindex: the media player is a keyboard-driven widget and must be focusable to receive shortcuts.
			tabIndex={0}
		>
			{/* biome-ignore lint/a11y/useMediaCaption: captions land with the narration pipeline. */}
			<video
				className="h-full w-full object-contain"
				playsInline
				ref={videoRef}
				src={url ?? undefined}
			/>

			{/* Title, top gradient. Right padding clears the panel's Hide button. */}
			<div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-5 pt-4 pb-12 opacity-0 transition-opacity group-data-[controls=true]:opacity-100">
				<p className="truncate pr-32 font-semibold text-white text-xl tracking-tight [text-shadow:0_1px_3px_rgb(0_0_0/0.5)]">
					{title}
				</p>
			</div>

			{/* Center play affordance while paused. */}
			{isPlaying ? null : (
				<button
					aria-label="Play"
					className="absolute flex size-16 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-transform hover:scale-105"
					onClick={togglePlay}
					type="button"
				>
					<PlayIcon className="size-7 fill-white" />
				</button>
			)}

			{/* Control bar, bottom gradient. */}
			<div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/70 to-transparent px-3 pt-8 pb-2 opacity-0 transition-opacity group-data-[controls=true]:opacity-100">
				<SliderPrimitive.Root
					aria-label="Seek"
					className="group/seek relative flex h-4 w-full touch-none select-none items-center"
					disabled={!seekable}
					max={seekable ? duration : 1}
					min={0}
					onValueChange={(vals) => {
						const video = videoRef.current;
						if (video) {
							video.currentTime = vals[0];
							setCurrentTime(vals[0]);
						}
					}}
					step={0.1}
					value={[currentTime]}
				>
					<SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-white/25">
						<SliderPrimitive.Range className="absolute h-full bg-primary" />
					</SliderPrimitive.Track>
					<SliderPrimitive.Thumb className="block size-3 rounded-full bg-white opacity-0 transition-opacity focus-visible:opacity-100 focus-visible:outline-none group-hover/seek:opacity-100" />
				</SliderPrimitive.Root>

				<div className="flex items-center gap-1 text-white">
					<Button
						aria-label={isPlaying ? "Pause" : "Play"}
						className="text-white hover:bg-white/15 hover:text-white"
						onClick={togglePlay}
						size="icon"
						variant="ghost"
					>
						{isPlaying ? (
							<PauseIcon className="size-4" />
						) : (
							<PlayIcon className="size-4" />
						)}
					</Button>
					<Button
						aria-label={muted ? "Unmute" : "Mute"}
						className="text-white hover:bg-white/15 hover:text-white"
						onClick={toggleMute}
						size="icon"
						variant="ghost"
					>
						{muted ? (
							<VolumeXIcon className="size-4" />
						) : (
							<Volume2Icon className="size-4" />
						)}
					</Button>
					<span className="ml-1 text-white/80 text-xs tabular-nums">
						{formatTime(currentTime)} / {formatTime(duration)}
					</span>

					<div className="flex-1" />

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								aria-label="Playback speed"
								className="gap-1 text-white text-xs hover:bg-white/15 hover:text-white"
								size="sm"
								variant="ghost"
							>
								<GaugeIcon className="size-4" />
								{rate}x
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{PLAYBACK_SPEEDS.map((speed) => (
								<DropdownMenuItem key={speed} onClick={() => changeRate(speed)}>
									{speed === 1 ? "Normal" : `${speed}x`}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					<Button
						aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
						className="text-white hover:bg-white/15 hover:text-white"
						onClick={toggleFullscreen}
						size="icon"
						variant="ghost"
					>
						{isFullscreen ? (
							<MinimizeIcon className="size-4" />
						) : (
							<MaximizeIcon className="size-4" />
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
