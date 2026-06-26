import { describe, expect, it } from "vitest";
import { EditFileInputSchema, RenderSceneInputSchema } from "../manim.ts";

describe("RenderSceneInputSchema", () => {
  it("defaults quality to high so deliveries are 1080p, not test-render res", () => {
    const result = RenderSceneInputSchema.parse({
      file: "scene.py",
      scene: "Main",
    });

    expect(result.quality).toBe("high");
  });

  it("still accepts an explicit low quality for fast iteration", () => {
    const result = RenderSceneInputSchema.parse({
      file: "scene.py",
      scene: "Main",
      quality: "low",
    });

    expect(result.quality).toBe("low");
  });
});

describe("EditFileInputSchema", () => {
  it("defaults replaceAll to false", () => {
    const result = EditFileInputSchema.parse({
      path: "scene.py",
      oldString: "a",
      newString: "b",
    });

    expect(result.replaceAll).toBe(false);
  });

  it("rejects an empty oldString", () => {
    const result = EditFileInputSchema.safeParse({
      path: "scene.py",
      oldString: "",
      newString: "b",
    });

    expect(result.success).toBe(false);
  });
});
