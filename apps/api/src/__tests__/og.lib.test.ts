import { describe, expect, it } from "vitest";
import { renderShareCardPng } from "../lib/og.ts";

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
