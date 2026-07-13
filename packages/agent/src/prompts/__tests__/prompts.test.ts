import { describe, expect, it } from "vitest";
import { CRAFT_LESSONS } from "../craft-lessons.ts";
import { MANIM_SYSTEM_PROMPT } from "../index.ts";
import { MANIM_CRAFT } from "../manim-craft.ts";

describe("MANIM_SYSTEM_PROMPT", () => {
  it("embeds both the mechanical craft rules and the distilled craft lessons", () => {
    expect(MANIM_SYSTEM_PROMPT).toContain(MANIM_CRAFT);
    expect(MANIM_SYSTEM_PROMPT).toContain(CRAFT_LESSONS);
  });

  it("orders the lessons after the mechanical craft and before 'How you work'", () => {
    const craftAt = MANIM_SYSTEM_PROMPT.indexOf(MANIM_CRAFT);
    const lessonsAt = MANIM_SYSTEM_PROMPT.indexOf(CRAFT_LESSONS);
    const howYouWorkAt = MANIM_SYSTEM_PROMPT.indexOf("## How you work");
    expect(craftAt).toBeGreaterThan(-1);
    expect(lessonsAt).toBeGreaterThan(craftAt);
    expect(howYouWorkAt).toBeGreaterThan(lessonsAt);
  });
});

describe("CRAFT_LESSONS", () => {
  it("keeps the guidance topic-agnostic, not math-only", () => {
    // The study over-sampled math/CS; the lessons must generalize.
    for (const domain of ["physics", "biology", "finance", "general topic"]) {
      expect(CRAFT_LESSONS).toContain(domain);
    }
  });

  it("carries the pedagogy, story, design and rigor pillars", () => {
    expect(CRAFT_LESSONS).toContain("Concrete before formal");
    expect(CRAFT_LESSONS).toContain("canonical visual model");
    expect(CRAFT_LESSONS).toContain("Color is a type system");
    expect(CRAFT_LESSONS).toContain("compute, don't fake");
  });

  it("includes concrete ManimCE techniques the agent should reach for", () => {
    for (const api of [
      "ValueTracker",
      "TransformFromCopy",
      "TransformMatchingTex",
      "LaggedStart",
      "become()",
      "Circumscribe",
      "MovingCameraScene",
    ]) {
      expect(CRAFT_LESSONS).toContain(api);
    }
  });

  it("renders LaTeX with single backslashes (not template-literal over-escaped)", () => {
    expect(CRAFT_LESSONS).toContain("\\over");
    expect(CRAFT_LESSONS).toContain("\\vdots");
    expect(CRAFT_LESSONS).not.toContain("\\\\over");
    expect(CRAFT_LESSONS).not.toContain("\\\\vdots");
  });
});
