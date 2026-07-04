import { describe, expect, it } from "vitest";
import {
  buildShareCardSvg,
  hashSeed,
  OG_HEIGHT,
  OG_WIDTH,
  SHARE_IMAGES,
  shareImageIndex,
  shareImageName,
} from "../share-card.ts";

const TSPAN_TAG = /<tspan/g;
const HREF = "/features/precision.webp";

describe("hashSeed", () => {
  it("is deterministic and non-negative", () => {
    expect(hashSeed("abc")).toBe(hashSeed("abc"));
    expect(hashSeed("abc")).toBeGreaterThanOrEqual(0);
  });

  it("differs across different seeds", () => {
    expect(hashSeed("abc")).not.toBe(hashSeed("abd"));
  });
});

describe("shareImageIndex / shareImageName", () => {
  it("always resolves within the curated painting set", () => {
    for (let i = 0; i < 200; i++) {
      const idx = shareImageIndex(`seed-${i}`);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(SHARE_IMAGES.length);
      expect(SHARE_IMAGES).toContain(shareImageName(`seed-${i}`));
    }
  });

  it("covers every painting across many seeds", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      seen.add(shareImageName(`seed-${i}`));
    }
    expect(seen.size).toBe(SHARE_IMAGES.length);
  });

  it("is stable for a given seed", () => {
    expect(shareImageName("fourier")).toBe(shareImageName("fourier"));
  });
});

describe("buildShareCardSvg", () => {
  const base = { title: "Fourier Series", seed: "tok1", imageHref: HREF };

  it("produces an svg at the requested (default OG) dimensions", () => {
    const svg = buildShareCardSvg(base);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(`width="${OG_WIDTH}"`);
    expect(svg).toContain(`height="${OG_HEIGHT}"`);
    expect(svg).toContain(`viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}"`);
  });

  it("honors explicit dimensions (16:9 poster)", () => {
    const svg = buildShareCardSvg({ ...base, width: 1280, height: 720 });
    expect(svg).toContain('width="1280"');
    expect(svg).toContain('height="720"');
  });

  it("embeds the supplied image href on the right and the brand line", () => {
    const svg = buildShareCardSvg(base);
    expect(svg).toContain(`<image href="${HREF}"`);
    expect(svg).toContain("Made with animus");
    expect(svg).toContain("Fourier");
  });

  it("escapes XML-significant characters in the title", () => {
    const svg = buildShareCardSvg({
      ...base,
      title: `A & B <script> "x" 'y'`,
    });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("A &amp; B");
    expect(svg).toContain("&lt;script&gt;");
  });

  it("is deterministic for identical input", () => {
    expect(buildShareCardSvg(base)).toBe(buildShareCardSvg(base));
  });

  it("wraps and ellipsizes an overlong title rather than overflowing", () => {
    const long = "word ".repeat(60).trim();
    const svg = buildShareCardSvg({ ...base, title: long });
    const tspans = svg.match(TSPAN_TAG) ?? [];
    expect(tspans.length).toBeLessThanOrEqual(3);
    expect(svg).toContain("…");
  });

  it("clamps a single word too long even at the smallest size", () => {
    // A single overlong word is accepted unconditionally by the wrapper; it must
    // still be ellipsized so it can't spill past the column into the painting.
    const svg = buildShareCardSvg({
      ...base,
      title: "Immunoelectrophoresisantibodyantigenprecipitationreactionassay",
    });
    const tspans = svg.match(TSPAN_TAG) ?? [];
    expect(tspans.length).toBe(1);
    expect(svg).toContain("…");
  });

  it("keeps a moderately long single word whole by shrinking to fit", () => {
    // "Electromagnetism" fits at a smaller font, so it renders whole (no "…").
    const svg = buildShareCardSvg({ ...base, title: "Electromagnetism" });
    expect(svg).toContain("Electromagnetism");
    expect(svg).not.toContain("…");
  });
});
