/** A curated set of ElevenLabs premade voices for narration, in the shape the
 * ElevenLabs VoicePicker expects. The preview URLs are the public sample clips
 * returned by the ElevenLabs voices API. */

import type { ElevenLabs } from "@elevenlabs/elevenlabs-js";

export const VOICES: ElevenLabs.Voice[] = [
	{
		voiceId: "Xb7hH8MSUJpSbSDYk0k2",
		name: "Alice",
		labels: {
			accent: "British",
			gender: "female",
			description: "Clear, engaging educator",
		},
		previewUrl:
			"https://storage.googleapis.com/eleven-public-prod/premade/voices/Xb7hH8MSUJpSbSDYk0k2/d10f7534-11f6-41fe-a012-2de1e482d336.mp3",
	},
	{
		voiceId: "EXAVITQu4vr4xnSDxMaL",
		name: "Sarah",
		labels: {
			accent: "American",
			gender: "female",
			description: "Mature, reassuring, confident",
		},
		previewUrl:
			"https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/01a3e33c-6e99-4ee7-8543-ff2216a32186.mp3",
	},
	{
		voiceId: "XrExE9yKIg1WjnnlVkGX",
		name: "Matilda",
		labels: {
			accent: "American",
			gender: "female",
			description: "Knowledgeable, professional",
		},
		previewUrl:
			"https://storage.googleapis.com/eleven-public-prod/premade/voices/XrExE9yKIg1WjnnlVkGX/b930e18d-6b4d-466e-bab2-0ae97c6d8535.mp3",
	},
	{
		voiceId: "CwhRBWXzGAHq8TQ4Fs17",
		name: "Roger",
		labels: {
			accent: "American",
			gender: "male",
			description: "Laid-back, casual, resonant",
		},
		previewUrl:
			"https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/58ee3ff5-f6f2-4628-93b8-e38eb31806b0.mp3",
	},
	{
		voiceId: "bIHbv24MWmeRgasZH58o",
		name: "Will",
		labels: {
			accent: "American",
			gender: "male",
			description: "Relaxed optimist",
		},
		previewUrl:
			"https://storage.googleapis.com/eleven-public-prod/premade/voices/bIHbv24MWmeRgasZH58o/8caf8f3d-ad29-4980-af41-53f20c72d7a4.mp3",
	},
	{
		voiceId: "SAz9YHcvj6GT2YYXdXww",
		name: "River",
		labels: {
			accent: "American",
			gender: "neutral",
			description: "Relaxed, neutral, informative",
		},
		previewUrl:
			"https://storage.googleapis.com/eleven-public-prod/premade/voices/SAz9YHcvj6GT2YYXdXww/e6c95f0b-2227-491a-b3d7-2249240decb7.mp3",
	},
	{
		voiceId: "pFZP5JQG7iQjIQuC4Bku",
		name: "Lily",
		labels: {
			accent: "British",
			gender: "female",
			description: "Warm, velvety",
		},
		previewUrl:
			"https://storage.googleapis.com/eleven-public-prod/premade/voices/pFZP5JQG7iQjIQuC4Bku/89b68b35-b3dd-4348-a84a-a3c13a3c2b30.mp3",
	},
];

export const DEFAULT_VOICE_ID = VOICES[0].voiceId;
