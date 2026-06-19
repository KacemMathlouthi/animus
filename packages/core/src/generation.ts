/** The per-user generation defaults that shape every video: theme, music,
 * narration voice, and font. One schema, used to validate the settings API,
 * type the settings UI, and configure the agent's render. */

import { z } from "zod";

export const VIDEO_THEMES = ["light", "dark"] as const;
export type VideoTheme = (typeof VIDEO_THEMES)[number];

export const FONT_VALUES = ["geist", "inter", "serif", "mono"] as const;
export type FontValue = (typeof FONT_VALUES)[number];

/** Font values paired with their display labels (for the settings picker). */
export const FONT_OPTIONS: { value: FontValue; label: string }[] = [
  { value: "geist", label: "Geist" },
  { value: "inter", label: "Inter" },
  { value: "serif", label: "Source Serif" },
  { value: "mono", label: "JetBrains Mono" },
];

/** Domain defaults for narration voice + background music. The web voice and
 * track catalogs (which carry the preview URLs) must include these ids so the
 * default selection resolves. */
export const DEFAULT_VOICE_ID = "Xb7hH8MSUJpSbSDYk0k2";
export const DEFAULT_MUSIC_TRACK_ID = "ambient";

export const GenerationSettingsSchema = z.object({
  videoTheme: z.enum(VIDEO_THEMES),
  backgroundMusic: z.boolean(),
  musicTrack: z.string().min(1),
  voiceId: z.string().min(1),
  font: z.enum(FONT_VALUES),
});
export type GenerationSettings = z.infer<typeof GenerationSettingsSchema>;

export const GENERATION_DEFAULTS: GenerationSettings = {
  videoTheme: "dark",
  backgroundMusic: true,
  musicTrack: DEFAULT_MUSIC_TRACK_ID,
  voiceId: DEFAULT_VOICE_ID,
  font: "geist",
};
