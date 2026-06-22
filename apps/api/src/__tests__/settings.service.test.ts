import { GENERATION_DEFAULTS } from "@animus/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFindUserSettings,
  mockFindProviderKey,
  mockInsertValues,
  mockInsertOnConflict,
  mockDeleteWhere,
} = vi.hoisted(() => ({
  mockFindUserSettings: vi.fn(),
  mockFindProviderKey: vi.fn(),
  mockInsertValues: vi.fn(),
  mockInsertOnConflict: vi.fn(),
  mockDeleteWhere: vi.fn(),
}));

vi.mock("@animus/db", () => ({
  db: {
    query: {
      userSettings: { findFirst: mockFindUserSettings },
      providerKey: { findFirst: mockFindProviderKey },
    },
    insert: () => ({
      values: mockInsertValues.mockImplementation(() => ({
        onConflictDoUpdate: mockInsertOnConflict,
      })),
    }),
    delete: () => ({ where: mockDeleteWhere }),
  },
  eq: vi.fn((left, right) => ({ eq: [left, right] })),
  providerKey: { userId: "provider_key.user_id" },
  userSettings: { userId: "user_settings.user_id" },
}));

vi.mock("../lib/crypto.ts", () => ({
  encryptSecret: vi.fn((value: string) => `encrypted:${value}`),
}));

const {
  deleteProviderKey,
  getGenerationSettings,
  getProviderKey,
  saveGenerationSettings,
  saveProviderKey,
} = await import("../services/settings.ts");

beforeEach(() => {
  vi.clearAllMocks();
  mockInsertOnConflict.mockResolvedValue(undefined);
  mockDeleteWhere.mockResolvedValue(undefined);
});

describe("settings service", () => {
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

  it("returns a masked provider key preview", async () => {
    mockFindProviderKey.mockResolvedValue({
      userId: "user-1",
      provider: "openai",
      keyLast4: "wxyz",
      keyEncrypted: "encrypted",
    });

    await expect(getProviderKey("user-1")).resolves.toEqual({
      provider: "openai",
      last4: "wxyz",
    });
  });

  it("encrypts and upserts provider keys", async () => {
    await expect(
      saveProviderKey({
        userId: "user-1",
        input: { provider: "anthropic", key: " sk-ant-abcdwxyz " },
      })
    ).resolves.toEqual({ provider: "anthropic", last4: "wxyz" });

    expect(mockInsertValues).toHaveBeenCalledWith({
      userId: "user-1",
      provider: "anthropic",
      keyEncrypted: "encrypted:sk-ant-abcdwxyz",
      keyLast4: "wxyz",
    });
  });

  it("deletes provider keys for the user", async () => {
    await deleteProviderKey("user-1");

    expect(mockDeleteWhere).toHaveBeenCalledTimes(1);
  });
});
