/** The score.
 *
 * The proposal specifies "In the Hall of the Mountain King" (Trent Reznor and
 * Atticus Ross, The Social Network, 2010). That is a commercial master: it
 * cannot be committed to this repository, and shipping it on YouTube or the
 * landing page needs a sync licence, so `public/` holds a silent placeholder
 * of the right length and the edit is cut to the arrangement without it.
 *
 * To score the film: drop the licensed audio into `apps/video/public/` and
 * point `SOUNDTRACK_FILE` at it. Nothing else changes; the volume automation
 * in `launch-video.tsx` is written against the film's own beats, not against
 * any particular waveform. */
export const SOUNDTRACK_FILE = "soundtrack.m4a";

/** Where in the track playback begins, in seconds. The recording opens with a
 * long ambient bed; the film wants the ostinato, which is where the tension
 * starts to build. Retune once the real track is in place. */
export const SOUNDTRACK_START_SECONDS = 0;
