import type { ElevenLabs } from "@elevenlabs/elevenlabs-js";
import { Check, ChevronsUpDown, Pause, Play } from "lucide-react";
import * as React from "react";
import {
	AudioPlayerProvider,
	useAudioPlayer,
} from "@/components/ui/audio-player";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Orb } from "@/components/ui/orb";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface VoicePickerProps {
	voices: ElevenLabs.Voice[];
	value?: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyLabel?: string;
	className?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

// Warm brand tones for the orb gradient (our --primary in light/dark), instead
// of the default blue. The orb itself inverts its backdrop per theme.
const ORB_COLORS: [string, string] = ["#4a3212", "#d8b98a"];

function capitalize(value?: string) {
	return value ? value.charAt(0).toUpperCase() + value.slice(1) : undefined;
}

function VoicePicker({
	voices,
	value,
	onValueChange,
	placeholder = "Select a voice...",
	searchPlaceholder = "Search voices...",
	emptyLabel = "No voice found.",
	className,
	open,
	onOpenChange,
}: VoicePickerProps) {
	const [internalOpen, setInternalOpen] = React.useState(false);
	const isControlled = open !== undefined;
	const isOpen = isControlled ? open : internalOpen;
	const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

	const selectedVoice = voices.find((v) => v.voiceId === value);

	return (
		<AudioPlayerProvider>
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={isOpen}
						className={cn("w-full justify-between", className)}
					>
						{selectedVoice ? (
							<div className="flex items-center gap-2 overflow-hidden">
								<div className="relative size-6 shrink-0 overflow-visible">
									<Orb
										agentState="thinking"
										className="absolute inset-0"
										colors={ORB_COLORS}
									/>
								</div>
								<span className="truncate">{selectedVoice.name}</span>
							</div>
						) : (
							placeholder
						)}
						<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
					<Command>
						<CommandInput placeholder={searchPlaceholder} />
						<CommandList>
							<CommandEmpty>{emptyLabel}</CommandEmpty>
							<CommandGroup>
								{voices.map((voice) => (
									<VoicePickerItem
										key={voice.voiceId}
										voice={voice}
										isSelected={value === voice.voiceId}
										onSelect={() => {
											onValueChange?.(voice.voiceId);
										}}
									/>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</AudioPlayerProvider>
	);
}

interface VoicePickerItemProps {
	voice: ElevenLabs.Voice;
	isSelected: boolean;
	onSelect: () => void;
}

function VoicePickerItem({
	voice,
	isSelected,
	onSelect,
}: VoicePickerItemProps) {
	const [isHovered, setIsHovered] = React.useState(false);
	const player = useAudioPlayer();

	const preview = voice.previewUrl;
	const audioItem = React.useMemo(
		() => (preview ? { id: voice.voiceId, src: preview, data: voice } : null),
		[preview, voice],
	);

	const isPlaying =
		audioItem && player.isItemActive(audioItem.id) && player.isPlaying;

	const handlePreview = React.useCallback(
		async (e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();

			if (!audioItem) return;

			if (isPlaying) {
				player.pause();
			} else {
				player.play(audioItem);
			}
		},
		[audioItem, isPlaying, player],
	);

	const meta = [
		voice.labels?.accent,
		capitalize(voice.labels?.gender),
		capitalize(voice.labels?.age),
		voice.labels?.description,
	].filter((part): part is string => Boolean(part));

	return (
		<CommandItem
			value={voice.voiceId}
			keywords={[
				voice.name,
				voice.labels?.accent,
				voice.labels?.gender,
				voice.labels?.age,
				voice.labels?.description,
				voice.labels?.["use case"],
			].filter((k): k is string => Boolean(k))}
			onSelect={onSelect}
			className="flex items-center gap-3"
		>
			<button
				aria-label={`Preview ${voice.name}`}
				className="relative z-10 size-8 shrink-0 cursor-pointer overflow-visible"
				onClick={handlePreview}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				type="button"
			>
				<Orb
					agentState={isPlaying ? "talking" : undefined}
					className="pointer-events-none absolute inset-0"
					colors={ORB_COLORS}
				/>
				{preview && isHovered && (
					<div className="pointer-events-none absolute inset-0 flex size-8 shrink-0 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-opacity hover:bg-black/50">
						{isPlaying ? (
							<Pause className="size-3 text-white" />
						) : (
							<Play className="size-3 text-white" />
						)}
					</div>
				)}
			</button>

			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="font-medium">{voice.name}</span>
				{meta.length > 0 && (
					<span className="truncate text-muted-foreground text-xs">
						{meta.join(" • ")}
					</span>
				)}
			</div>

			<Check
				className={cn(
					"ml-auto size-4 shrink-0",
					isSelected ? "opacity-100" : "opacity-0",
				)}
			/>
		</CommandItem>
	);
}

export { VoicePicker, VoicePickerItem };
