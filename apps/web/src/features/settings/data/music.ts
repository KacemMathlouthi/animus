/** Background-music tracks offered under the narration. Public-domain classical
 * recordings stored in R2; preview URLs are resolved at runtime from the API
 * (GET /api/media/music-preview) so the preview is the actual track you get.
 * Provenance: apps/api/assets/MUSIC_LICENSES.md. */

export interface MusicTrack {
  id: string;
  mood: string;
  name: string;
}

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "ambient",
    name: "Ambient",
    mood: "Calm, wistful",
  },
  {
    id: "upbeat",
    name: "Upbeat",
    mood: "Bright, energetic",
  },
  {
    id: "cinematic",
    name: "Cinematic",
    mood: "Warm, building",
  },
];
