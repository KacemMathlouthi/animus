import { describe, expect, it } from "vitest";
import { PROVIDER_IDS, PROVIDERS, ProviderIdSchema } from "../providers.ts";

const HTTPS_URL = /^https:\/\//;

describe("PROVIDER_IDS", () => {
  it("is the expected provider set", () => {
    expect(PROVIDER_IDS).toEqual([
      "openai",
      "anthropic",
      "google",
      "mistral",
      "groq",
      "xai",
    ]);
  });
});

describe("ProviderIdSchema", () => {
  it("accepts every known provider id", () => {
    for (const id of PROVIDER_IDS) {
      expect(ProviderIdSchema.safeParse(id).success).toBe(true);
    }
  });

  it("rejects an unknown provider id", () => {
    expect(ProviderIdSchema.safeParse("cohere").success).toBe(false);
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

  it("uses valid provider ids that match the schema", () => {
    for (const provider of PROVIDERS) {
      expect(ProviderIdSchema.safeParse(provider.id).success).toBe(true);
    }
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
});
