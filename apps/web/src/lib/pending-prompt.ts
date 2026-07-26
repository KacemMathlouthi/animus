/** One-shot handoff for a prompt a signed-out visitor typed on the landing page:
 * stash it, send them through auth, replay it in the studio. Uses localStorage
 * (not router state) because OAuth/magic links fully reload the page — possibly
 * in a new tab — so in-memory state wouldn't survive. Read-once + a short TTL
 * keep a stale prompt from firing on some unrelated later visit. */

const KEY = "animus:pending-prompt";
const TTL_MS = 60 * 60 * 1000; // 1 hour

export function stashPendingPrompt(text: string): void {
  const value = text.trim();
  if (!value) {
    return;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify({ text: value, at: Date.now() }));
  } catch {
    // Storage can be unavailable (private mode, quota) — the prompt is simply
    // not carried through; the user lands in an empty studio.
  }
}

/** Return the stashed prompt exactly once (clearing it), or null if absent,
 * malformed, or older than the TTL. */
export function takePendingPrompt(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return null;
    }
    localStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as { text?: unknown; at?: unknown };
    if (typeof parsed.text !== "string" || typeof parsed.at !== "number") {
      return null;
    }
    if (Date.now() - parsed.at > TTL_MS) {
      return null;
    }
    return parsed.text.trim() || null;
  } catch {
    return null;
  }
}
