import { describe, expect, it } from "vitest";

import { GRID, identiconFrom } from "@/lib/identicon";

describe("identiconFrom", () => {
  it("is deterministic for a seed", () => {
    expect(identiconFrom("ada@example.com:Ada")).toEqual(
      identiconFrom("ada@example.com:Ada")
    );
  });

  it("returns a square grid of booleans", () => {
    const { cells } = identiconFrom("ada@example.com:Ada");
    expect(cells).toHaveLength(GRID);
    for (const row of cells) {
      expect(row).toHaveLength(GRID);
      for (const cell of row) {
        expect(typeof cell).toBe("boolean");
      }
    }
  });

  it("mirrors each row across the vertical axis", () => {
    for (const seed of ["a", "grace@example.com:Grace", "", ":", "🙂"]) {
      for (const row of identiconFrom(seed).cells) {
        for (let column = 0; column < GRID; column++) {
          expect(row[column]).toBe(row[GRID - 1 - column]);
        }
      }
    }
  });

  it("keeps every hue within the brand band around --primary", () => {
    for (let i = 0; i < 200; i++) {
      const { hue } = identiconFrom(`user${i}@example.com:User ${i}`);
      expect(Number.isInteger(hue)).toBe(true);
      // BRAND_HUE 74 +/- HUE_SPREAD 10: a narrow band around `--primary`, so
      // no mark ever strays off the brand colour.
      expect(hue).toBeGreaterThanOrEqual(64);
      expect(hue).toBeLessThanOrEqual(84);
    }
  });

  it("gives different seeds different marks", () => {
    expect(identiconFrom("ada@example.com:Ada")).not.toEqual(
      identiconFrom("grace@example.com:Grace")
    );
  });

  it("reacts to either half of an email:name seed", () => {
    const base = identiconFrom("ada@example.com:Ada");
    expect(identiconFrom("ada@example.com:A. Lovelace")).not.toEqual(base);
    expect(identiconFrom("grace@example.com:Ada")).not.toEqual(base);
  });

  it("varies the hue across the band rather than collapsing onto one value", () => {
    const hues = new Set(
      Array.from(
        { length: 200 },
        (_, i) => identiconFrom(`user${i}@x.com:User`).hue
      )
    );
    expect(hues.size).toBeGreaterThan(10);
  });

  it("fills roughly half the grid, so marks are neither sparse nor solid", () => {
    const runs = 300;
    let filled = 0;
    for (let i = 0; i < runs; i++) {
      filled += identiconFrom(`user${i}@x.com:User`)
        .cells.flat()
        .filter(Boolean).length;
    }
    const average = filled / runs;
    const cellCount = GRID * GRID;
    expect(average).toBeGreaterThan(cellCount * 0.42);
    expect(average).toBeLessThan(cellCount * 0.58);
  });

  it("handles an empty seed without throwing", () => {
    expect(() => identiconFrom("")).not.toThrow();
  });
});
