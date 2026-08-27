import { describe, expect, it } from "vitest";
import { createRedactor } from "../utils/redact.ts";

const KEY = "sk_2f8c1a4b9e7d0c3a6f5b8e2d1c4a7b0e9f6d3c8a";
const OTHER = "xi_9b3e7c1d5a8f2e6b0c4d7a1f3e9b5c8d2a6f0e4b";

describe("createRedactor", () => {
  it("removes the secret when echoed whole", () => {
    const redact = createRedactor([KEY]);
    const out = redact(`ELEVEN_API_KEY=${KEY}`);
    expect(out).not.toContain(KEY);
    expect(out).toBe("ELEVEN_API_KEY=[redacted]");
  });

  it("removes a leading fragment", () => {
    // `echo ${ELEVEN_API_KEY:0:10}` — the bypass a whole-string match misses.
    const redact = createRedactor([KEY]);
    const out = redact(`first half: ${KEY.slice(0, 10)}`);
    expect(out).not.toContain(KEY.slice(0, 10));
  });

  it("removes a trailing fragment", () => {
    const redact = createRedactor([KEY]);
    const out = redact(`rest: ${KEY.slice(10)}`);
    expect(out).not.toContain(KEY.slice(10));
  });

  it("removes a fragment taken from the middle", () => {
    const redact = createRedactor([KEY]);
    const middle = KEY.slice(12, 28);
    expect(redact(`chunk ${middle} chunk`)).not.toContain(middle);
  });

  it("removes every chunk when the key is echoed piece by piece", () => {
    // `echo ${KEY:0:12}; echo ${KEY:12:12}; ...` — the fragmenting bypass, in
    // its most practical form.
    const redact = createRedactor([KEY]);
    const chunks: string[] = [];
    for (let i = 0; i < KEY.length; i += 12) {
      chunks.push(KEY.slice(i, i + 12));
    }
    const out = redact(chunks.join("\n"));
    // Every chunk at or above the threshold goes. A trailing remainder shorter
    // than that survives — see the next test.
    for (const chunk of chunks.filter((c) => c.length >= 8)) {
      expect(out).not.toContain(chunk);
    }
  });

  it("cannot catch a fragment shorter than the threshold, by design", () => {
    // Pinned so nobody mistakes this for a boundary. Matching runs this short
    // would shred ordinary logs; only the sandbox not holding the key fixes it.
    const redact = createRedactor([KEY]);
    const tiny = KEY.slice(0, 7);
    expect(redact(tiny)).toBe(tiny);
  });

  it("collapses a whole key to a single marker, not one per fragment", () => {
    const redact = createRedactor([KEY]);
    expect(redact(KEY)).toBe("[redacted]");
  });

  it("redacts every secret it was given", () => {
    const redact = createRedactor([KEY, OTHER]);
    const out = redact(`a=${KEY} b=${OTHER}`);
    expect(out).toBe("a=[redacted] b=[redacted]");
  });

  it("leaves ordinary render output untouched", () => {
    const redact = createRedactor([KEY]);
    const log = [
      "INFO Animation 84 : Partial movie file written in",
      "'/home/daytona/project/media/videos/scene/480p15/NineRepeating.mp4'",
      "Rendered NineRepeating. Played 88 animations",
    ].join("\n");
    expect(redact(log)).toBe(log);
  });

  it("ignores undefined and short values rather than corrupting output", () => {
    // A short "secret" would match real words and shred the logs.
    const redact = createRedactor([undefined, "dev", "placeholder"]);
    const log = "placeholder text in a dev render";
    expect(redact(log)).toBe(log);
  });

  it("is safe to reuse across calls", () => {
    // The pattern is global; a stale lastIndex would make the second call miss.
    const redact = createRedactor([KEY]);
    expect(redact(KEY)).toBe("[redacted]");
    expect(redact(KEY)).toBe("[redacted]");
  });

  it("does not treat regex metacharacters in a secret as syntax", () => {
    const tricky = "abc.def*ghi+jkl(mno)pqr[stu]";
    const redact = createRedactor([tricky]);
    expect(redact(`k=${tricky}`)).toBe("k=[redacted]");
    expect(redact("abcXdefYghi")).toBe("abcXdefYghi");
  });
});
