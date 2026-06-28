import { GENERATION_DEFAULTS } from "@animus/core";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteProviderKey,
  getGenerationSettings,
  getProviderKey,
  saveGenerationSettings,
  saveProviderKey,
} = vi.hoisted(() => ({
  deleteProviderKey: vi.fn(),
  getGenerationSettings: vi.fn(),
  getProviderKey: vi.fn(),
  saveGenerationSettings: vi.fn(),
  saveProviderKey: vi.fn(),
}));

vi.mock("../services/settings.ts", () => ({
  deleteProviderKey,
  getGenerationSettings,
  getProviderKey,
  saveGenerationSettings,
  saveProviderKey,
}));
// Bypass the real session resolution; the wrapper app injects the user instead.
vi.mock("../middleware/auth.ts", () => ({
  requireAuth: (_c: unknown, next: () => Promise<void>) => next(),
}));

const { settingsRoute } = await import("../routes/settings.ts");

type TestUser = { id: string } | null;

function appWith(user: TestUser) {
  const app = new Hono<{ Variables: { user: TestUser } }>();
  app.use("*", async (c, next) => {
    c.set("user", user);
    await next();
  });
  app.route("/settings", settingsRoute);
  return app;
}

function jsonReq(path: string, method: string, body: unknown) {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    path,
  };
}

beforeEach(() => {
  deleteProviderKey.mockReset();
  getGenerationSettings.mockReset();
  getProviderKey.mockReset();
  saveGenerationSettings.mockReset();
  saveProviderKey.mockReset();
});

describe("GET /settings/generation", () => {
  it("returns the caller's generation settings", async () => {
    getGenerationSettings.mockResolvedValue(GENERATION_DEFAULTS);

    const res = await appWith({ id: "u1" }).request("/settings/generation");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ settings: GENERATION_DEFAULTS });
    expect(getGenerationSettings).toHaveBeenCalledWith("u1");
  });

  it("returns null when the user has no row yet", async () => {
    getGenerationSettings.mockResolvedValue(null);

    const res = await appWith({ id: "u1" }).request("/settings/generation");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ settings: null });
  });
});

describe("PUT /settings/generation", () => {
  function put(user: TestUser, body: unknown) {
    const r = jsonReq("/settings/generation", "PUT", body);
    return appWith(user).request(r.path, r);
  }

  it("400s on an invalid body", async () => {
    const res = await put(
      { id: "u1" },
      { ...GENERATION_DEFAULTS, videoTheme: "neon" }
    );

    expect(res.status).toBe(400);
    expect(saveGenerationSettings).not.toHaveBeenCalled();
  });

  it("400s on a missing field", async () => {
    const res = await put({ id: "u1" }, { backgroundMusic: true });

    expect(res.status).toBe(400);
    expect(saveGenerationSettings).not.toHaveBeenCalled();
  });

  it("saves valid generation settings", async () => {
    saveGenerationSettings.mockResolvedValue(GENERATION_DEFAULTS);

    const res = await put({ id: "u1" }, GENERATION_DEFAULTS);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ settings: GENERATION_DEFAULTS });
    expect(saveGenerationSettings).toHaveBeenCalledWith({
      userId: "u1",
      settings: GENERATION_DEFAULTS,
    });
  });
});

describe("GET /settings/keys", () => {
  it("returns the masked key preview", async () => {
    getProviderKey.mockResolvedValue({ provider: "anthropic", last4: "cdef" });

    const res = await appWith({ id: "u1" }).request("/settings/keys");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      key: { provider: "anthropic", last4: "cdef" },
    });
    expect(getProviderKey).toHaveBeenCalledWith("u1");
  });

  it("returns null when no key is stored", async () => {
    getProviderKey.mockResolvedValue(null);

    const res = await appWith({ id: "u1" }).request("/settings/keys");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ key: null });
  });
});

describe("PUT /settings/keys", () => {
  function put(user: TestUser, body: unknown) {
    const r = jsonReq("/settings/keys", "PUT", body);
    return appWith(user).request(r.path, r);
  }

  it("400s on an unknown provider", async () => {
    const res = await put(
      { id: "u1" },
      { provider: "nope", key: "sk-ant-longenough" }
    );

    expect(res.status).toBe(400);
    expect(saveProviderKey).not.toHaveBeenCalled();
  });

  it("400s on a too-short key", async () => {
    const res = await put(
      { id: "u1" },
      { provider: "anthropic", key: "short" }
    );

    expect(res.status).toBe(400);
    expect(saveProviderKey).not.toHaveBeenCalled();
  });

  it("saves a valid key and returns the masked preview", async () => {
    saveProviderKey.mockResolvedValue({ provider: "anthropic", last4: "ough" });

    const res = await put(
      { id: "u1" },
      { provider: "anthropic", key: "sk-ant-longenough" }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      key: { provider: "anthropic", last4: "ough" },
    });
    expect(saveProviderKey).toHaveBeenCalledWith({
      userId: "u1",
      input: { provider: "anthropic", key: "sk-ant-longenough" },
    });
  });
});

describe("DELETE /settings/keys", () => {
  it("deletes the caller's provider key", async () => {
    deleteProviderKey.mockResolvedValue(undefined);

    const res = await appWith({ id: "u1" }).request("/settings/keys", {
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(deleteProviderKey).toHaveBeenCalledWith("u1");
  });
});
