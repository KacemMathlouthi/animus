import { beforeEach, describe, expect, it, vi } from "vitest";
import { shareCardAssetsPresent, shareCardPng } from "../lib/og.ts";

const MISSING_ASSET_ERROR = /share-card asset missing: .*share-images.*\.jpg/;

function isPng(bytes: Buffer): boolean {
  return (
    bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71
  );
}

/** A distinct seed per case, so the module-level cache never crosses tests. */
let seedCounter = 0;
function seed(): string {
  seedCounter += 1;
  return `seed-${seedCounter}`;
}

describe("shareCardPng", () => {
  it("rasterizes the share card to a non-trivial PNG", async () => {
    const png = await shareCardPng({ title: "Fourier Series", seed: seed() });
    expect(isPng(png)).toBe(true);
    expect(png.length).toBeGreaterThan(1000);
  });

  it("is deterministic for identical input", async () => {
    const s = seed();
    const a = await shareCardPng({ title: "Same", seed: s });
    const b = await shareCardPng({ title: "Same", seed: s });
    expect(a.equals(b)).toBe(true);
  });

  it("produces different bytes for different titles", async () => {
    const s = seed();
    const a = await shareCardPng({ title: "Alpha", seed: s });
    const b = await shareCardPng({ title: "Beta", seed: s });
    expect(a.equals(b)).toBe(false);
  });

  it("handles an empty title without throwing", async () => {
    const png = await shareCardPng({ title: "", seed: seed() });
    expect(isPng(png)).toBe(true);
  });
});

describe("shareCardPng caching", () => {
  it("returns the cached buffer rather than rasterizing again", async () => {
    const s = seed();
    const first = await shareCardPng({ title: "Cached", seed: s });
    const second = await shareCardPng({ title: "Cached", seed: s });
    // Same instance, not merely equal bytes: proof no second render ran.
    expect(second).toBe(first);
  });

  it("keys on the title as well as the seed", async () => {
    const s = seed();
    const a = await shareCardPng({ title: "One", seed: s });
    const b = await shareCardPng({ title: "Two", seed: s });
    expect(b).not.toBe(a);
  });

  it("collapses a burst on one card into a single render", async () => {
    // The real case: a link is posted and many crawlers fetch the same URL at
    // once, before anything is cached. Without this they all rasterize.
    const s = seed();
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        shareCardPng({ title: "Viral", seed: s })
      )
    );
    expect(results.every((png) => png === results[0])).toBe(true);
  });

  it("evicts least-recently-used entries instead of growing forever", async () => {
    // A card is ~600KB, so an unbounded cache is a slow memory leak on a task
    // that also holds live render streams. Rasterizing is stubbed: filling the
    // cache for real costs 18 renders and proves nothing extra.
    vi.resetModules();
    vi.doMock("@resvg/resvg-js", () => ({
      renderAsync: () =>
        Promise.resolve({ asPng: () => Buffer.from([137, 80, 78, 71]) }),
    }));
    const og = await import("../lib/og.ts");

    const first = { title: "First", seed: "lru" };
    const firstPng = await og.shareCardPng(first);
    for (let i = 0; i < 17; i++) {
      await og.shareCardPng({ title: `Filler ${i}`, seed: `lru-${i}` });
    }

    expect(await og.shareCardPng(first)).not.toBe(firstPng);

    vi.doUnmock("@resvg/resvg-js");
    vi.resetModules();
  });

  it("does not cache a failed render", async () => {
    vi.resetModules();
    let fail = true;
    vi.doMock("@resvg/resvg-js", () => ({
      renderAsync: () => {
        if (fail) {
          return Promise.reject(new Error("rasterize failed"));
        }
        return Promise.resolve({ asPng: () => Buffer.from([137, 80, 78, 71]) });
      },
    }));
    const og = await import("../lib/og.ts");

    await expect(
      og.shareCardPng({ title: "T", seed: "retry" })
    ).rejects.toThrow("rasterize failed");

    // A poisoned in-flight entry would make every later request fail too.
    fail = false;
    expect(isPng(await og.shareCardPng({ title: "T", seed: "retry" }))).toBe(
      true
    );

    vi.doUnmock("@resvg/resvg-js");
    vi.resetModules();
  });
});

describe("shareCardAssetsPresent", () => {
  it("finds every bundled font and painting in the repo", () => {
    expect(shareCardAssetsPresent()).toBe(true);
  });
});

describe("asset loading resilience", () => {
  // Regression: a .vercelignore pattern once stripped apps/api/assets and og.ts
  // crashed the whole API at boot. Only rendering may fail, and it must name
  // the missing file.
  it("survives module import without assets; rendering fails descriptively", async () => {
    vi.resetModules();
    vi.doMock("node:fs", () => ({
      existsSync: (): boolean => false,
      readFileSync: (): never => {
        throw Object.assign(new Error("ENOENT: no such file or directory"), {
          code: "ENOENT",
        });
      },
    }));

    // Must not throw — this exact import crashed at boot before the fix.
    const og = await import("../lib/og.ts");

    expect(og.shareCardAssetsPresent()).toBe(false);
    await expect(og.shareCardPng({ title: "T", seed: "seed" })).rejects.toThrow(
      MISSING_ASSET_ERROR
    );

    vi.doUnmock("node:fs");
    vi.resetModules();
  });
});

beforeEach(() => {
  vi.restoreAllMocks();
});
