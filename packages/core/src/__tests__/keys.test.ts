import { describe, expect, it } from "vitest";
import { ProviderKeyInputSchema } from "../keys.ts";

describe("ProviderKeyInputSchema", () => {
  it("accepts a valid provider and key", () => {
    const result = ProviderKeyInputSchema.safeParse({
      provider: "anthropic",
      key: "sk-ant-abcdefgh",
    });
    expect(result.success).toBe(true);
  });

  it("trims surrounding whitespace from the key", () => {
    const result = ProviderKeyInputSchema.safeParse({
      provider: "openai",
      key: "  sk-abcdefgh  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.key).toBe("sk-abcdefgh");
    }
  });

  it("rejects an unknown provider", () => {
    expect(
      ProviderKeyInputSchema.safeParse({ provider: "acme", key: "sk-abcdefgh" })
        .success
    ).toBe(false);
  });

  it("rejects a whitespace-only key", () => {
    expect(
      ProviderKeyInputSchema.safeParse({ provider: "openai", key: "        " })
        .success
    ).toBe(false);
  });

  it("rejects a key shorter than the minimum length", () => {
    expect(
      ProviderKeyInputSchema.safeParse({ provider: "openai", key: "sk-1" })
        .success
    ).toBe(false);
  });

  it("rejects a key over 512 chars", () => {
    expect(
      ProviderKeyInputSchema.safeParse({
        provider: "openai",
        key: "a".repeat(513),
      }).success
    ).toBe(false);
  });
});
