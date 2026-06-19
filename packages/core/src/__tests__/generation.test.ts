import { describe, expect, it } from "vitest";
import {
  GENERATION_DEFAULTS,
  GenerationSettingsSchema,
} from "../generation.ts";

describe("GenerationSettingsSchema", () => {
  it("accepts the defaults", () => {
    expect(
      GenerationSettingsSchema.safeParse(GENERATION_DEFAULTS).success
    ).toBe(true);
  });

  it("rejects an unknown video theme", () => {
    const result = GenerationSettingsSchema.safeParse({
      ...GENERATION_DEFAULTS,
      videoTheme: "sepia",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown font", () => {
    const result = GenerationSettingsSchema.safeParse({
      ...GENERATION_DEFAULTS,
      font: "comic-sans",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty voiceId", () => {
    const result = GenerationSettingsSchema.safeParse({
      ...GENERATION_DEFAULTS,
      voiceId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing field", () => {
    const { backgroundMusic, ...partial } = GENERATION_DEFAULTS;
    expect(GenerationSettingsSchema.safeParse(partial).success).toBe(false);
  });
});
