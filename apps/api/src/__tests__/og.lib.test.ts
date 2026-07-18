import { describe, expect, it, vi } from "vitest";
import { renderShareCardPng, shareCardAssetsPresent } from "../lib/og.ts";

const MISSING_ASSET_ERROR = /share-card asset missing: .*share-images.*\.jpg/;

function isPng(bytes: Buffer): boolean {
  return (
    bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71
  );
}

describe("renderShareCardPng", () => {
  it("rasterizes the share card to a non-trivial PNG", () => {
    const png = renderShareCardPng({ title: "Fourier Series", seed: "tok1" });
    expect(isPng(png)).toBe(true);
    expect(png.length).toBeGreaterThan(1000);
  });

  it("is deterministic for identical input", () => {
    const a = renderShareCardPng({ title: "Same", seed: "seed" });
    const b = renderShareCardPng({ title: "Same", seed: "seed" });
    expect(a.equals(b)).toBe(true);
  });

  it("produces different bytes for different titles", () => {
    const a = renderShareCardPng({ title: "Alpha", seed: "seed" });
    const b = renderShareCardPng({ title: "Beta", seed: "seed" });
    expect(a.equals(b)).toBe(false);
  });

  it("handles an empty title without throwing", () => {
    const png = renderShareCardPng({ title: "", seed: "seed" });
    expect(isPng(png)).toBe(true);
  });
});

describe("shareCardAssetsPresent", () => {
  it("finds every bundled font and painting in the repo", () => {
    expect(shareCardAssetsPresent()).toBe(true);
  });
});

describe("asset loading resilience", () => {
  // Regression for the deploy incident where a .vercelignore pattern stripped
  // apps/api/assets from the image: og.ts then crashed the whole API at boot.
  // Assets must load lazily — importing the module with unreadable assets must
  // succeed, and only rendering may fail, with an error naming the file.
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
    expect(() => og.renderShareCardPng({ title: "T", seed: "seed" })).toThrow(
      MISSING_ASSET_ERROR
    );

    vi.doUnmock("node:fs");
    vi.resetModules();
  });
});
