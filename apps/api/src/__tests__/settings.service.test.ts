import { GENERATION_DEFAULTS, LLM_MODELS } from "@animus/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFindUserSettings,
  mockFindManyProviderKeys,
  mockFindFirstProviderKey,
  mockInsertValues,
  mockInsertOnConflict,
  mockDeleteWhere,
} = vi.hoisted(() => ({
  mockFindUserSettings: vi.fn(),
  mockFindManyProviderKeys: vi.fn(),
  mockFindFirstProviderKey: vi.fn(),
  mockInsertValues: vi.fn(),
  mockInsertOnConflict: vi.fn(),
  mockDeleteWhere: vi.fn(),
}));

vi.mock("@animus/db", () => ({
  db: {
    query: {
      userSettings: { findFirst: mockFindUserSettings },
      providerKey: {
        findMany: mockFindManyProviderKeys,
        findFirst: mockFindFirstProviderKey,
      },
    },
    insert: () => ({
      values: mockInsertValues.mockImplementation(() => ({
        onConflictDoUpdate: mockInsertOnConflict,
      })),
    }),
    delete: () => ({ where: mockDeleteWhere }),
  },
  and: vi.fn((...args) => ({ and: args })),
  eq: vi.fn((left, right) => ({ eq: [left, right] })),
  providerKey: {
    userId: "provider_key.user_id",
    kind: "provider_key.kind",
  },
  userSettings: { userId: "user_settings.user_id" },
}));

const ENCRYPTED_PREFIX = /^encrypted:/;

vi.mock("../lib/crypto.ts", () => ({
  encryptSecret: vi.fn((value: string) => `encrypted:${value}`),
  decryptSecret: vi.fn((value: string) => value.replace(ENCRYPTED_PREFIX, "")),
}));

const {
  deleteProviderKey,
  getDecryptedLlmKey,
  getDecryptedTtsKey,
  getGenerationSettings,
  getProviderKeys,
  saveGenerationSettings,
  saveProviderKey,
} = await import("../services/settings.ts");

const anthropicModel = LLM_MODELS.anthropic[0]?.id;
if (!anthropicModel) {
  throw new Error("curated LLM model list must not be empty");
}

beforeEach(() => {
  vi.clearAllMocks();
  mockInsertOnConflict.mockResolvedValue(undefined);
  mockDeleteWhere.mockResolvedValue(undefined);
});

describe("generation settings", () => {
  it("maps generation settings rows to public settings", async () => {
    mockFindUserSettings.mockResolvedValue({
      userId: "user-1",
      videoTheme: "light",
      backgroundMusic: false,
      musicTrack: "upbeat",
      voiceId: "voice-x",
      font: "inter",
    });

    await expect(getGenerationSettings("user-1")).resolves.toEqual({
      videoTheme: "light",
      backgroundMusic: false,
      musicTrack: "upbeat",
      voiceId: "voice-x",
      font: "inter",
    });
  });

  it("returns null when generation settings are absent", async () => {
    mockFindUserSettings.mockResolvedValue(undefined);
    await expect(getGenerationSettings("user-1")).resolves.toBeNull();
  });

  it("upserts generation settings for the user", async () => {
    await expect(
      saveGenerationSettings({
        userId: "user-1",
        settings: GENERATION_DEFAULTS,
      })
    ).resolves.toEqual(GENERATION_DEFAULTS);

    expect(mockInsertValues).toHaveBeenCalledWith({
      ...GENERATION_DEFAULTS,
      userId: "user-1",
    });
    expect(mockInsertOnConflict).toHaveBeenCalledTimes(1);
  });
});

describe("provider keys", () => {
  it("returns both masked previews from the stored rows", async () => {
    mockFindManyProviderKeys.mockResolvedValue([
      {
        kind: "llm",
        provider: "anthropic",
        model: anthropicModel,
        keyLast4: "wxyz",
      },
      { kind: "tts", provider: "elevenlabs", model: null, keyLast4: "1234" },
    ]);

    await expect(getProviderKeys("user-1")).resolves.toEqual({
      llm: {
        kind: "llm",
        provider: "anthropic",
        model: anthropicModel,
        last4: "wxyz",
      },
      tts: { kind: "tts", provider: "elevenlabs", last4: "1234" },
    });
  });

  it("returns nulls when the user has no keys", async () => {
    mockFindManyProviderKeys.mockResolvedValue([]);
    await expect(getProviderKeys("user-1")).resolves.toEqual({
      llm: null,
      tts: null,
    });
  });

  it("encrypts and upserts an LLM key with its model", async () => {
    await expect(
      saveProviderKey({
        userId: "user-1",
        input: {
          kind: "llm",
          provider: "anthropic",
          model: anthropicModel,
          key: " sk-ant-abcdwxyz ",
        },
      })
    ).resolves.toEqual({
      kind: "llm",
      provider: "anthropic",
      model: anthropicModel,
      last4: "wxyz",
    });

    expect(mockInsertValues).toHaveBeenCalledWith({
      userId: "user-1",
      kind: "llm",
      provider: "anthropic",
      model: anthropicModel,
      keyEncrypted: "encrypted:sk-ant-abcdwxyz",
      keyLast4: "wxyz",
    });
  });

  it("encrypts and upserts a TTS key with no model", async () => {
    await expect(
      saveProviderKey({
        userId: "user-1",
        input: { kind: "tts", key: "sk_elevenlabs_key" },
      })
    ).resolves.toEqual({ kind: "tts", provider: "elevenlabs", last4: "_key" });

    expect(mockInsertValues).toHaveBeenCalledWith({
      userId: "user-1",
      kind: "tts",
      provider: "elevenlabs",
      model: null,
      keyEncrypted: "encrypted:sk_elevenlabs_key",
      keyLast4: "_key",
    });
  });

  it("deletes the key of a given kind", async () => {
    await deleteProviderKey("user-1", "tts");
    expect(mockDeleteWhere).toHaveBeenCalledTimes(1);
  });

  it("decrypts the LLM key for the agent", async () => {
    mockFindFirstProviderKey.mockResolvedValue({
      kind: "llm",
      provider: "openai",
      model: "gpt-4.1",
      keyEncrypted: "encrypted:sk-openai",
    });

    await expect(getDecryptedLlmKey("user-1")).resolves.toEqual({
      provider: "openai",
      model: "gpt-4.1",
      apiKey: "sk-openai",
    });
  });

  it("returns undefined when there is no LLM key", async () => {
    mockFindFirstProviderKey.mockResolvedValue(undefined);
    await expect(getDecryptedLlmKey("user-1")).resolves.toBeUndefined();
  });

  it("decrypts the TTS key", async () => {
    mockFindFirstProviderKey.mockResolvedValue({
      kind: "tts",
      provider: "elevenlabs",
      keyEncrypted: "encrypted:sk_eleven",
    });
    await expect(getDecryptedTtsKey("user-1")).resolves.toBe("sk_eleven");
  });

  it("returns undefined when there is no TTS key", async () => {
    mockFindFirstProviderKey.mockResolvedValue(undefined);
    await expect(getDecryptedTtsKey("user-1")).resolves.toBeUndefined();
  });
});
