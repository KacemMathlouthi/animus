import { describe, expect, it } from "vitest";
import { ProviderKeyInputSchema } from "../keys.ts";
import { LLM_MODELS } from "../providers.ts";

const anthropicModel = LLM_MODELS.anthropic[0]?.id;
const openaiModel = LLM_MODELS.openai[0]?.id;
if (!(anthropicModel && openaiModel)) {
  throw new Error("curated LLM model lists must not be empty");
}

describe("ProviderKeyInputSchema — LLM keys", () => {
  it("accepts a valid provider, curated model, and key", () => {
    const result = ProviderKeyInputSchema.safeParse({
      kind: "llm",
      provider: "anthropic",
      model: anthropicModel,
      key: "sk-ant-abcdefgh",
    });
    expect(result.success).toBe(true);
  });

  it("trims surrounding whitespace from the key", () => {
    const result = ProviderKeyInputSchema.safeParse({
      kind: "llm",
      provider: "openai",
      model: openaiModel,
      key: "  sk-abcdefgh  ",
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.kind === "llm") {
      expect(result.data.key).toBe("sk-abcdefgh");
    }
  });

  it("rejects an unknown provider", () => {
    expect(
      ProviderKeyInputSchema.safeParse({
        kind: "llm",
        provider: "acme",
        model: anthropicModel,
        key: "sk-abcdefgh",
      }).success
    ).toBe(false);
  });

  it("rejects a model that is not curated for its provider", () => {
    const result = ProviderKeyInputSchema.safeParse({
      kind: "llm",
      provider: "anthropic",
      model: openaiModel,
      key: "sk-ant-abcdefgh",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing model", () => {
    expect(
      ProviderKeyInputSchema.safeParse({
        kind: "llm",
        provider: "anthropic",
        key: "sk-ant-abcdefgh",
      }).success
    ).toBe(false);
  });

  it("rejects a whitespace-only key", () => {
    expect(
      ProviderKeyInputSchema.safeParse({
        kind: "llm",
        provider: "openai",
        model: openaiModel,
        key: "        ",
      }).success
    ).toBe(false);
  });

  it("rejects a key shorter than the minimum length", () => {
    expect(
      ProviderKeyInputSchema.safeParse({
        kind: "llm",
        provider: "openai",
        model: openaiModel,
        key: "sk-1",
      }).success
    ).toBe(false);
  });

  it("rejects a key over 512 chars", () => {
    expect(
      ProviderKeyInputSchema.safeParse({
        kind: "llm",
        provider: "openai",
        model: openaiModel,
        key: "a".repeat(513),
      }).success
    ).toBe(false);
  });
});

describe("ProviderKeyInputSchema — TTS keys", () => {
  it("accepts a valid ElevenLabs key (no model)", () => {
    const result = ProviderKeyInputSchema.safeParse({
      kind: "tts",
      key: "sk_elevenlabs_key",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a too-short TTS key", () => {
    expect(
      ProviderKeyInputSchema.safeParse({ kind: "tts", key: "short" }).success
    ).toBe(false);
  });

  it("rejects an unknown kind", () => {
    expect(
      ProviderKeyInputSchema.safeParse({
        kind: "image",
        key: "sk-abcdefgh",
      }).success
    ).toBe(false);
  });

  it("rejects a missing kind", () => {
    expect(
      ProviderKeyInputSchema.safeParse({ key: "sk-abcdefgh" }).success
    ).toBe(false);
  });
});
