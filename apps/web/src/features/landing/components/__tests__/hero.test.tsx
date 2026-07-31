import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The hero's own logic is its background plates; the prompt pulls auth, routing,
// and conversation creation, none of which this is about.
vi.mock("@/features/landing/components/hero-prompt", () => ({
  HeroPrompt: () => <div data-testid="hero-prompt" />,
}));

const { HeroSection } = await import("../hero.tsx");

function renderHero() {
  const { container } = render(<HeroSection />);
  const plates = Array.from(container.querySelectorAll("img"));
  const light = plates.find((p) => p.getAttribute("src")?.includes("light"));
  const dark = plates.find((p) => p.getAttribute("src")?.includes("dark"));
  if (!(light && dark)) {
    throw new Error("expected a light and a dark plate");
  }
  return { container, dark, light, plates };
}

describe("HeroSection", () => {
  it("renders exactly the cross-fading pair, with no leftover spill copies", () => {
    const { plates } = renderHero();

    expect(plates).toHaveLength(2);
  });

  it("serves AVIF, with no fallback to pay for", () => {
    const { container, dark, light } = renderHero();

    expect(light.getAttribute("src")).toBe("/hero/hero-light.avif");
    expect(dark.getAttribute("src")).toBe("/hero/hero-dark.avif");
    // The stylesheet's color-mix()/oklch() already require newer browsers than
    // AVIF does, so a <picture> fallback would be dead weight.
    expect(container.querySelector("picture")).toBeNull();
    expect(container.querySelector("source")).toBeNull();
  });

  it("declares each plate's real intrinsic size so the box is reserved correctly", () => {
    const { dark, light, plates } = renderHero();

    for (const plate of plates) {
      // A wrong ratio makes the browser reserve the wrong box before the file
      // lands, which is what a stale 2880x1146 was doing.
      expect(plate.getAttribute("width")).toBe("3344");
    }
    // The heights differ on purpose. The dark plate is cropped at the top so
    // that, bottom-anchored, its artwork lands in register with the light one --
    // the pair are two separate generations and drifted during the cross-fade.
    // Copying the light height onto both would silently squash it back.
    expect(light.getAttribute("height")).toBe("1881");
    expect(dark.getAttribute("height")).toBe("1833");
  });

  it("registers the plates by crop rather than by transform", () => {
    const { dark, light } = renderHero();

    // A translate would have to be re-tuned per viewport and fights object-cover
    // on mobile; the crop is carried by the file itself.
    expect(light.className).not.toContain("translate-y");
    expect(dark.className).not.toContain("translate-y");
  });

  it("keeps both plates decorative, so screen readers skip them", () => {
    const { plates } = renderHero();

    for (const plate of plates) {
      expect(plate.getAttribute("alt")).toBe("");
    }
  });

  it("prioritises only the light plate, so the pair does not race for bandwidth", () => {
    const { dark, light } = renderHero();

    expect(light.getAttribute("fetchpriority")).toBe("high");
    expect(dark.getAttribute("fetchpriority")).toBeNull();
  });

  it("cross-fades the pair on the theme rather than swapping a src", () => {
    const { dark, light } = renderHero();

    expect(light.className).toContain("opacity-100");
    expect(light.className).toContain("dark:opacity-0");
    expect(dark.className).toContain("opacity-0");
    expect(dark.className).toContain("dark:opacity-100");
  });

  it("fills on mobile and takes natural proportions from md up", () => {
    const { plates } = renderHero();

    for (const plate of plates) {
      // Cover anchored to the bottom crops the empty upper field, keeping the
      // engraved ground line.
      expect(plate.className).toContain("object-cover");
      expect(plate.className).toContain("object-bottom");
      // Releasing `top` is what lets h-auto win on desktop; without it the box
      // is over-constrained and stays stretched to the section height.
      expect(plate.className).toContain("md:top-auto");
      expect(plate.className).toContain("md:h-auto");
    }
  });

  it("gives the copy a halo so it separates from the painting in both themes", () => {
    const { container } = renderHero();

    // .hero-copy is a background-coloured halo, which works in either theme
    // because --background is the maximum-contrast partner of --foreground.
    // Anything sitting on the plate without it relies on the plate alone.
    for (const selector of ["h1", "p"]) {
      const el = container.querySelector(selector);
      expect(el?.className).toContain("hero-copy");
    }
  });

  it("raises the call to action off the painting", () => {
    const { container } = renderHero();

    const cta = container.querySelector("a[href='#video']");
    expect(cta?.className).toContain("hero-raised");
    // shadow-sm was a single flat drop that vanished on the night plate.
    expect(cta?.className).not.toContain("shadow-sm");
  });

  it("masks both edges with matching standard and -webkit gradients", () => {
    const { plates } = renderHero();

    for (const plate of plates) {
      // Divergent copies would render differently in Safari, and Tailwind emits
      // nothing at all for an interpolated arbitrary property — both failures
      // are silent, so assert the literal pair is present.
      expect(plate.className).toContain(
        "[mask-image:linear-gradient(to_top,transparent_0%,rgba(0,0,0,0.55)_2%,black_6%,black_52%,rgba(0,0,0,0.4)_76%,transparent_95%)]"
      );
      expect(plate.className).toContain(
        "[-webkit-mask-image:linear-gradient(to_top,transparent_0%,rgba(0,0,0,0.55)_2%,black_6%,black_52%,rgba(0,0,0,0.4)_76%,transparent_95%)]"
      );
    }
  });
});
