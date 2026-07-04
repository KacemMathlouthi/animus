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
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds)) {
		return "0:00";
	}
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function VideoControlBar({
	seekable,
	currentTime,
	duration,
	isPlaying,
	muted,
	rate,
	isFullscreen,
	onSeek,
	onTogglePlay,
	onToggleMute,
	onChangeRate,
	onToggleFullscreen,
}: {
	seekable: boolean;
	currentTime: number;
	duration: number;
	isPlaying: boolean;
	muted: boolean;
	rate: number;
	isFullscreen: boolean;
	onSeek: (value: number) => void;
	onTogglePlay: () => void;
	onToggleMute: () => void;
	onChangeRate: (rate: number) => void;
	onToggleFullscreen: () => void;
}) {
	return (
		<div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-linear-to-t from-black/70 to-transparent px-3 pt-8 pb-2 opacity-0 transition-opacity group-data-[controls=true]:opacity-100">
			<SliderPrimitive.Root
				aria-label="Seek"
				className="group/seek relative flex h-4 w-full touch-none select-none items-center"
				disabled={!seekable}
				max={seekable ? duration : 1}
				min={0}
				onValueChange={(vals) => onSeek(vals[0])}
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
					onClick={onTogglePlay}
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
					onClick={onToggleMute}
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
							<DropdownMenuItem key={speed} onClick={() => onChangeRate(speed)}>
								{speed === 1 ? "Normal" : `${speed}x`}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				<Button
					aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
					className="text-white hover:bg-white/15 hover:text-white"
					onClick={onToggleFullscreen}
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
	);
}
