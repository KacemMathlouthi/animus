import { describe, expect, it, vi } from "vitest";

vi.mock("@ai-sdk/amazon-bedrock", () => ({
  createAmazonBedrock: vi.fn(() => (id: string) => `bedrock:${id}`),
}));
vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic:
    ({ apiKey }: { apiKey: string }) =>
    (model: string) =>
      `anthropic:${model}:${apiKey}`,
}));
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI:
    ({ apiKey }: { apiKey: string }) =>
    (model: string) =>
      `openai:${model}:${apiKey}`,
}));
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI:
    ({ apiKey }: { apiKey: string }) =>
    (model: string) =>
      `google:${model}:${apiKey}`,
}));
vi.mock("@animus/core/env", () => ({
  getServerEnv: () => ({ bedrockModel: "bedrock-default-id" }),
}));

const { getModel, resolveModel } = await import("../config/index.ts");

describe("getModel", () => {
  it("defaults to the env Bedrock model", () => {
    expect(getModel()).toBe("bedrock:bedrock-default-id");
  });

  it("honors an explicit model override", () => {
    expect(getModel("haiku-id")).toBe("bedrock:haiku-id");
  });
});

describe("resolveModel", () => {
  it("uses metered Bedrock when no BYOK key is given", () => {
    const resolved = resolveModel();
    expect(resolved.model).toBe("bedrock:bedrock-default-id");
    expect(resolved.isLlmMetered).toBe(true);
    expect(resolved.modelId).toBe("bedrock-default-id");
  });

  it("uses the user's Anthropic key, unmetered", () => {
    const resolved = resolveModel({
      provider: "anthropic",
      model: "claude-opus-4-6",
      apiKey: "sk-ant-key",
    });
    expect(resolved.model).toBe("anthropic:claude-opus-4-6:sk-ant-key");
    expect(resolved.isLlmMetered).toBe(false);
    expect(resolved.modelId).toBe("claude-opus-4-6");
  });

  it("uses the user's OpenAI key", () => {
    const resolved = resolveModel({
      provider: "openai",
      model: "gpt-4.1",
      apiKey: "sk-openai",
    });
    expect(resolved.model).toBe("openai:gpt-4.1:sk-openai");
    expect(resolved.isLlmMetered).toBe(false);
  });

  it("uses the user's Google key", () => {
    const resolved = resolveModel({
      provider: "google",
      model: "gemini-2.5-pro",
      apiKey: "aiza-key",
    });
    expect(resolved.model).toBe("google:gemini-2.5-pro:aiza-key");
    expect(resolved.isLlmMetered).toBe(false);
  });
});
