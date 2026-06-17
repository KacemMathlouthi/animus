import type { ElevenLabs } from "@elevenlabs/elevenlabs-js";
import { LockIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { VoicePicker } from "@/components/ui/voice-picker";
import { cn } from "@/lib/utils";
import { DEFAULT_TRACK_ID, MUSIC_TRACKS } from "../data/music";
import { DEFAULT_VOICE_ID, VOICES } from "../data/voices";
import { SectionHeading, SettingRow, SettingsSaveBar } from "./settings-ui";

interface GenerationConfig {
	videoTheme: "light" | "dark";
	backgroundMusic: boolean;
	musicTrack: string;
	voiceId: string;
	font: string;
}

const DEFAULT_CONFIG: GenerationConfig = {
	videoTheme: "dark",
	backgroundMusic: true,
	musicTrack: DEFAULT_TRACK_ID,
	voiceId: DEFAULT_VOICE_ID,
	font: "geist",
};

const FONTS = [
	{ value: "geist", label: "Geist" },
	{ value: "inter", label: "Inter" },
	{ value: "serif", label: "Source Serif" },
	{ value: "mono", label: "JetBrains Mono" },
];

// Reuse the voice picker for music by describing tracks in the same shape.
const MUSIC_OPTIONS: ElevenLabs.Voice[] = MUSIC_TRACKS.map((track) => ({
	voiceId: track.id,
	name: track.name,
	previewUrl: track.preview,
	labels: { description: track.mood },
}));

export function GenerationSection() {
	const [config, setConfig] = useState<GenerationConfig>(DEFAULT_CONFIG);
	const [savedConfig, setSavedConfig] =
		useState<GenerationConfig>(DEFAULT_CONFIG);

	const dirty = JSON.stringify(config) !== JSON.stringify(savedConfig);

	function update(patch: Partial<GenerationConfig>) {
		setConfig((prev) => ({ ...prev, ...patch }));
	}

	return (
		<div>
			<SectionHeading
				description="Defaults applied to the explainer videos you generate."
				title="Generation settings"
			/>

			<div>
				<SettingRow
					description="The look of the rendered video canvas."
					title="Video theme"
				>
					<div className="flex gap-1 rounded-lg border p-0.5">
						{(["light", "dark"] as const).map((option) => (
							<button
								className={cn(
									"rounded-md px-3 py-1 text-sm capitalize transition-colors",
									config.videoTheme === option
										? "bg-muted text-foreground"
										: "text-muted-foreground hover:text-foreground",
								)}
								key={option}
								onClick={() => update({ videoTheme: option })}
								type="button"
							>
								{option}
							</button>
						))}
					</div>
				</SettingRow>

				<SettingRow
					description="Use your own brand colors across the animation."
					disabled
					title={
						<span className="flex items-center gap-2">
							Brand palette
							<Badge variant="outline">
								<LockIcon className="size-3" />
								Coming soon
							</Badge>
						</span>
					}
				>
					<div className="flex gap-1.5">
						{["#4a3212", "#b08442", "#e8d9c0", "#1c1917"].map((color) => (
							<span
								className="size-6 rounded-full border"
								key={color}
								style={{ backgroundColor: color }}
							/>
						))}
					</div>
				</SettingRow>

				<SettingRow
					description="Add a subtle soundtrack under the narration."
					title="Background music"
				>
					<Switch
						checked={config.backgroundMusic}
						onCheckedChange={(checked) => update({ backgroundMusic: checked })}
					/>
				</SettingRow>

				{config.backgroundMusic ? (
					<SettingRow
						description="Pick a track. Press play to preview."
						stacked
						title="Music track"
					>
						<VoicePicker
							emptyLabel="No track found."
							onValueChange={(id) => update({ musicTrack: id })}
							placeholder="Select a track..."
							searchPlaceholder="Search tracks..."
							value={config.musicTrack}
							voices={MUSIC_OPTIONS}
						/>
					</SettingRow>
				) : null}

				<SettingRow
					description="Typeface used for on-screen text and titles."
					title="Font"
				>
					<Select
						onValueChange={(value) => update({ font: value })}
						value={config.font}
					>
						<SelectTrigger className="w-44">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{FONTS.map((font) => (
								<SelectItem key={font.value} value={font.value}>
									{font.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</SettingRow>

				<SettingRow
					description="The narrator for your videos. Hover a voice and press play to hear a sample."
					stacked
					title="Voiceover"
				>
					<VoicePicker
						onValueChange={(id) => update({ voiceId: id })}
						value={config.voiceId}
						voices={VOICES}
					/>
				</SettingRow>
			</div>

			<SettingsSaveBar
				dirty={dirty}
				onReset={() => setConfig(savedConfig)}
				onSave={() => setSavedConfig(config)}
			/>
		</div>
	);
}
