import type { User } from "@animus/auth";
import { GENERATION_DEFAULTS } from "@animus/core";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppEnv } from "../types.ts";

// Mocks (mock-prefixed names so vitest allows them inside the hoisted factories).
const mockFindUserSettings = vi.fn();
const mockFindProviderKey = vi.fn();
const mockInsertOnConflict = vi.fn().mockResolvedValue(undefined);
const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);

vi.mock("@animus/db", () => ({
  db: {
    query: {
      userSettings: { findFirst: mockFindUserSettings },
      providerKey: { findFirst: mockFindProviderKey },
    },
    insert: () => ({
      values: () => ({ onConflictDoUpdate: mockInsertOnConflict }),
    }),
    delete: () => ({ where: mockDeleteWhere }),
  },
  eq: () => "eq-clause",
  userSettings: { userId: "user_id" },
  providerKey: { userId: "user_id" },
}));

// Keep the auth instance from constructing (it would need real env + a DB).
vi.mock("@animus/auth", () => ({ auth: {} }));

// Give crypto a valid key without the rest of the backend env.
vi.mock("@animus/core/env", () => ({
  getServerEnv: () => ({ encryptionKey: Buffer.alloc(32).toString("base64") }),
}));

const { settingsRoute } = await import("../routes/settings.ts");

const TEST_USER = { id: "user-1" } as unknown as User;

function makeApp(user: User | null) {
  const app = new Hono<AppEnv>();
  app.use("*", (c, next) => {
    c.set("user", user);
    c.set("session", null);
    return next();
  });
  app.route("/settings", settingsRoute);
  return app;
}

function putJson(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockInsertOnConflict.mockResolvedValue(undefined);
  mockDeleteWhere.mockResolvedValue(undefined);
});

describe("settings routes — auth", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await makeApp(null).request("/settings/generation");
    expect(res.status).toBe(401);
  });
});

describe("settings routes — generation", () => {
  it("returns the mapped settings when a row exists", async () => {
    mockFindUserSettings.mockResolvedValue({
      userId: "user-1",
      videoTheme: "light",
      backgroundMusic: false,
      musicTrack: "upbeat",
      voiceId: "voice-x",
      font: "inter",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const res = await makeApp(TEST_USER).request("/settings/generation");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { settings: unknown };
    expect(body.settings).toEqual({
      videoTheme: "light",
      backgroundMusic: false,
      musicTrack: "upbeat",
      voiceId: "voice-x",
      font: "inter",
    });
  });

  it("returns null settings when no row exists", async () => {
    mockFindUserSettings.mockResolvedValue(undefined);
    const res = await makeApp(TEST_USER).request("/settings/generation");
    const body = (await res.json()) as { settings: unknown };
    expect(body.settings).toBeNull();
  });

  it("saves valid generation settings", async () => {
    const res = await makeApp(TEST_USER).request(
      putJson("/settings/generation", GENERATION_DEFAULTS)
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { settings: unknown };
    expect(body.settings).toEqual(GENERATION_DEFAULTS);
    expect(mockInsertOnConflict).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid generation settings", async () => {
    const res = await makeApp(TEST_USER).request(
      putJson("/settings/generation", {
        ...GENERATION_DEFAULTS,
        videoTheme: "sepia",
      })
    );
    expect(res.status).toBe(400);
    expect(mockInsertOnConflict).not.toHaveBeenCalled();
  });
});

describe("settings routes — keys", () => {
  it("returns only a masked preview when a key exists", async () => {
    mockFindProviderKey.mockResolvedValue({
      userId: "user-1",
      provider: "openai",
      keyEncrypted: "iv.tag.ciphertext",
      keyLast4: "wxyz",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const res = await makeApp(TEST_USER).request("/settings/keys");
    const body = (await res.json()) as { key: unknown };
    expect(body.key).toEqual({ provider: "openai", last4: "wxyz" });
  });

  it("stores an encrypted key and returns a masked preview", async () => {
    const res = await makeApp(TEST_USER).request(
      putJson("/settings/keys", {
        provider: "anthropic",
        key: "sk-ant-abcdwxyz",
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      key: { provider: string; last4: string };
    };
    expect(body.key).toEqual({ provider: "anthropic", last4: "wxyz" });
    // The plaintext key is never echoed back.
    expect(JSON.stringify(body)).not.toContain("sk-ant-abcdwxyz");
  });

  it("rejects a too-short key", async () => {
    const res = await makeApp(TEST_USER).request(
      putJson("/settings/keys", { provider: "openai", key: "sk-1" })
    );
    expect(res.status).toBe(400);
    expect(mockInsertOnConflict).not.toHaveBeenCalled();
  });

  it("deletes the stored key", async () => {
    const res = await makeApp(TEST_USER).request(
      new Request("http://localhost/settings/keys", { method: "DELETE" })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(mockDeleteWhere).toHaveBeenCalledTimes(1);
  });
});
