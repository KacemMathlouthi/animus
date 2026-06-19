/** Background-music tracks offered under the narration. Placeholder samples for
 * now (public demo clips) until a curated, licensed library is wired up. */

export interface MusicTrack {
	id: string;
	name: string;
	mood: string;
	preview: string;
}

// Hosted on the ElevenLabs CDN, which sends CORS headers (the audio player
// loads clips with crossOrigin="anonymous", so the host must allow it).
const CDN =
	"https://storage.googleapis.com/eleven-public-cdn/audio/ui-elevenlabs-io";

export const MUSIC_TRACKS: MusicTrack[] = [
	{
		id: "ambient",
		name: "Ambient",
		mood: "Calm, atmospheric",
		preview: `${CDN}/00.mp3`,
	},
	{
		id: "upbeat",
		name: "Upbeat",
		mood: "Bright, energetic",
		preview: `${CDN}/01.mp3`,
	},
	{
		id: "cinematic",
		name: "Cinematic",
		mood: "Dramatic, building",
		preview: `${CDN}/02.mp3`,
	},
];
