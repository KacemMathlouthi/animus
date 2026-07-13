/** Cross-component signals for the credit system, over window events — the same
 * lightweight event-bus pattern the conversation list uses. `credits-changed`
 * tells the balance gauge to refetch after a turn; `out-of-credits` opens the
 * depletion dialog when a metered turn is refused. */

const CREDITS_CHANGED = "animus:credits-changed";
const OUT_OF_CREDITS_EVENT = "animus:out-of-credits";

export function notifyCreditsChanged(): void {
	window.dispatchEvent(new Event(CREDITS_CHANGED));
}

export function onCreditsChanged(handler: () => void): () => void {
	window.addEventListener(CREDITS_CHANGED, handler);
	return () => window.removeEventListener(CREDITS_CHANGED, handler);
}

export function notifyOutOfCredits(): void {
	window.dispatchEvent(new Event(OUT_OF_CREDITS_EVENT));
}

export function onOutOfCredits(handler: () => void): () => void {
	window.addEventListener(OUT_OF_CREDITS_EVENT, handler);
	return () => window.removeEventListener(OUT_OF_CREDITS_EVENT, handler);
}
