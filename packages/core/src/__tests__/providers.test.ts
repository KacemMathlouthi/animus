import { describe, expect, it } from "vitest";
import {
  isValidModelForProvider,
  LLM_MODELS,
  PROVIDER_IDS,
  PROVIDERS,
  ProviderIdSchema,
  TTS_PROVIDER,
  TTS_PROVIDER_ID,
} from "../providers.ts";

const HTTPS_URL = /^https:\/\//;

describe("PROVIDER_IDS", () => {
  it("is the supported LLM provider set", () => {
    expect(PROVIDER_IDS).toEqual(["anthropic", "openai", "google"]);
  });
});

describe("ProviderIdSchema", () => {
  it("accepts every known provider id", () => {
    for (const id of PROVIDER_IDS) {
      expect(ProviderIdSchema.safeParse(id).success).toBe(true);
    }
  });

  it("rejects a provider we no longer support", () => {
    expect(ProviderIdSchema.safeParse("mistral").success).toBe(false);
  });

  it("rejects the TTS provider (not an LLM provider)", () => {
    expect(ProviderIdSchema.safeParse("elevenlabs").success).toBe(false);
  });

  it("rejects a non-string value", () => {
    expect(ProviderIdSchema.safeParse(null).success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(ProviderIdSchema.safeParse("").success).toBe(false);
  });
});

describe("PROVIDERS", () => {
  it("has one entry per provider id", () => {
    expect(PROVIDERS).toHaveLength(PROVIDER_IDS.length);
    expect(PROVIDERS.map((p) => p.id)).toEqual([...PROVIDER_IDS]);
  });

  it("has no duplicate ids", () => {
    const ids = PROVIDERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("provides complete, non-empty metadata for each provider", () => {
    for (const provider of PROVIDERS) {
      expect(provider.name.length).toBeGreaterThan(0);
      expect(provider.envKey.length).toBeGreaterThan(0);
      expect(provider.placeholder.length).toBeGreaterThan(0);
      expect(provider.docsUrl).toMatch(HTTPS_URL);
    }
  });

  it("uses unique env-var names", () => {
    const envKeys = PROVIDERS.map((p) => p.envKey);
    expect(new Set(envKeys).size).toBe(envKeys.length);
  });

  it("offers at least one curated model per provider", () => {
    for (const provider of PROVIDERS) {
      expect(provider.models.length).toBeGreaterThan(0);
      for (const model of provider.models) {
        expect(model.id.length).toBeGreaterThan(0);
        expect(model.name.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("LLM_MODELS", () => {
  it("mirrors each provider's curated model list", () => {
    for (const provider of PROVIDERS) {
      expect(LLM_MODELS[provider.id]).toEqual(provider.models);
    }
  });
});

describe("isValidModelForProvider", () => {
  it("accepts a curated model for its provider", () => {
    const model = LLM_MODELS.anthropic[0]?.id;
    expect(model).toBeDefined();
    expect(isValidModelForProvider("anthropic", model ?? "")).toBe(true);
  });

  it("rejects a model from a different provider", () => {
    const openaiModel = LLM_MODELS.openai[0]?.id;
    expect(isValidModelForProvider("anthropic", openaiModel ?? "")).toBe(false);
  });

  it("rejects an unknown model", () => {
    expect(isValidModelForProvider("google", "not-a-real-model")).toBe(false);
  });
});

describe("TTS_PROVIDER", () => {
  it("is ElevenLabs with complete metadata", () => {
    expect(TTS_PROVIDER.id).toBe(TTS_PROVIDER_ID);
    expect(TTS_PROVIDER.id).toBe("elevenlabs");
    expect(TTS_PROVIDER.name.length).toBeGreaterThan(0);
    expect(TTS_PROVIDER.docsUrl).toMatch(HTTPS_URL);
  });
});
