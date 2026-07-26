import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stashPendingPrompt, takePendingPrompt } from "@/lib/pending-prompt";

const KEY = "animus:pending-prompt";
const HOUR_MS = 60 * 60 * 1000;

describe("pending prompt", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("round-trips a prompt across the auth redirect", () => {
    stashPendingPrompt("Explain the Fourier transform");

    expect(takePendingPrompt()).toBe("Explain the Fourier transform");
  });

  it("returns it exactly once", () => {
    stashPendingPrompt("Explain entropy");

    expect(takePendingPrompt()).toBe("Explain entropy");
    // A second read must be empty, or a strict-mode double effect (or a later
    // visit to /studio) would replay the prompt and start a second video.
    expect(takePendingPrompt()).toBeNull();
  });

  it("is null when nothing was stashed", () => {
    expect(takePendingPrompt()).toBeNull();
  });

  it("trims the stored prompt and ignores a blank one", () => {
    stashPendingPrompt("   ");
    expect(takePendingPrompt()).toBeNull();

    stashPendingPrompt("  Explain entropy  ");
    expect(takePendingPrompt()).toBe("Explain entropy");
  });

  it("discards a prompt older than the TTL", () => {
    vi.useFakeTimers();
    stashPendingPrompt("Explain entropy");

    vi.advanceTimersByTime(HOUR_MS + 1);

    expect(takePendingPrompt()).toBeNull();
  });

  it("keeps a prompt that is still inside the TTL", () => {
    vi.useFakeTimers();
    stashPendingPrompt("Explain entropy");

    vi.advanceTimersByTime(HOUR_MS - 1000);

    expect(takePendingPrompt()).toBe("Explain entropy");
  });

  it("ignores a malformed entry instead of throwing", () => {
    localStorage.setItem(KEY, "not json");
    expect(takePendingPrompt()).toBeNull();

    localStorage.setItem(KEY, JSON.stringify({ text: 42, at: Date.now() }));
    expect(takePendingPrompt()).toBeNull();

    localStorage.setItem(KEY, JSON.stringify({ text: "hi" }));
    expect(takePendingPrompt()).toBeNull();
  });

  it("survives storage being unavailable", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

    // Private mode / quota: the prompt is simply not carried through.
    expect(() => stashPendingPrompt("Explain entropy")).not.toThrow();
    setItem.mockRestore();
  });
});
