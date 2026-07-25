/** The film's spine.
 *
 * Every scene length lives here in seconds so the edit can be retimed from one
 * place. `SCENES` is consumed in order by `<LaunchVideo />`, which lays them
 * out back to back on the timeline; nothing downstream hardcodes a start
 * frame. The four beats mirror the proposal deck: hook, demo, features, ask. */

export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const sec = (seconds: number): number => Math.round(seconds * FPS);

export type SceneId =
	| "cold-open"
	| "nothing-sticks"
	| "brand-turn"
	| "the-prompt"
	| "the-work"
	| "the-render"
	| "features"
	| "the-message"
	| "the-ask";

type SceneSpec = { id: SceneId; seconds: number };

/** Beat 01 hook, beat 02 demo, beat 03 features, beat 04 ask. */
export const SCENES: SceneSpec[] = [
	{ id: "cold-open", seconds: 8 },
	{ id: "nothing-sticks", seconds: 5 },
	{ id: "brand-turn", seconds: 5.5 },
	{ id: "the-prompt", seconds: 6.5 },
	{ id: "the-work", seconds: 9 },
	{ id: "the-render", seconds: 10 },
	{ id: "features", seconds: 16 },
	{ id: "the-message", seconds: 9 },
	{ id: "the-ask", seconds: 7 },
];

/** Scenes overlap by this much so cuts can cross-dissolve instead of snapping;
 * the layout subtracts it from each successive start. */
export const CROSSFADE = sec(0.35);

export const TOTAL_FRAMES: number =
	SCENES.reduce((total, scene) => total + sec(scene.seconds), 0) -
	CROSSFADE * (SCENES.length - 1);
