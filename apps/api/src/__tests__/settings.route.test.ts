import { GENERATION_DEFAULTS, LLM_MODELS } from "@animus/core";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteProviderKey,
  getGenerationSettings,
  getProviderKeys,
  saveGenerationSettings,
  saveProviderKey,
  validateLlmKey,
  validateTtsKey,
} = vi.hoisted(() => ({
  deleteProviderKey: vi.fn(),
  getGenerationSettings: vi.fn(),
  getProviderKeys: vi.fn(),
  saveGenerationSettings: vi.fn(),
  saveProviderKey: vi.fn(),
  validateLlmKey: vi.fn(),
  validateTtsKey: vi.fn(),
}));

vi.mock("../services/settings.ts", () => ({
  deleteProviderKey,
  getGenerationSettings,
  getProviderKeys,
  saveGenerationSettings,
  saveProviderKey,
}));
vi.mock("../services/provider-validation.ts", () => ({
  validateLlmKey,
  validateTtsKey,
}));
// Bypass the real session resolution; the wrapper app injects the user instead.
vi.mock("../middleware/auth.ts", () => ({
  requireAuth: (_c: unknown, next: () => Promise<void>) => next(),
}));

const { settingsRoute } = await import("../routes/settings.ts");

const anthropicModel = LLM_MODELS.anthropic[0]?.id;
const openaiModel = LLM_MODELS.openai[0]?.id;
if (!(anthropicModel && openaiModel)) {
  throw new Error("curated LLM model lists must not be empty");
}

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
  vi.clearAllMocks();
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
  it("returns both masked key previews", async () => {
    const keys = {
      llm: {
        kind: "llm",
        provider: "anthropic",
        model: anthropicModel,
        last4: "cdef",
      },
      tts: null,
    };
    getProviderKeys.mockResolvedValue(keys);
    const res = await appWith({ id: "u1" }).request("/settings/keys");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ keys });
    expect(getProviderKeys).toHaveBeenCalledWith("u1");
  });
});

describe("PUT /settings/keys", () => {
  function put(user: TestUser, body: unknown) {
    const r = jsonReq("/settings/keys", "PUT", body);
    return appWith(user).request(r.path, r);
  }

  it("400s on an unknown provider without validating or saving", async () => {
    const res = await put(
      { id: "u1" },
      {
        kind: "llm",
        provider: "nope",
        model: anthropicModel,
        key: "sk-ant-longenough",
      }
    );
    expect(res.status).toBe(400);
    expect(validateLlmKey).not.toHaveBeenCalled();
    expect(saveProviderKey).not.toHaveBeenCalled();
  });

  it("400s on a model not offered for the provider", async () => {
    const res = await put(
      { id: "u1" },
      {
        kind: "llm",
        provider: "anthropic",
        model: openaiModel,
        key: "sk-ant-longenough",
      }
    );
    expect(res.status).toBe(400);
    expect(saveProviderKey).not.toHaveBeenCalled();
  });

  it("400s (and does not save) when validation fails", async () => {
    validateLlmKey.mockResolvedValue(false);
    const res = await put(
      { id: "u1" },
      {
        kind: "llm",
        provider: "anthropic",
        model: anthropicModel,
        key: "sk-ant-badkey",
      }
    );
    expect(res.status).toBe(400);
    expect(validateLlmKey).toHaveBeenCalledWith("anthropic", "sk-ant-badkey");
    expect(saveProviderKey).not.toHaveBeenCalled();
  });

  it("validates then saves a valid LLM key", async () => {
    validateLlmKey.mockResolvedValue(true);
    saveProviderKey.mockResolvedValue({
      kind: "llm",
      provider: "anthropic",
      model: anthropicModel,
      last4: "ough",
    });
    const res = await put(
      { id: "u1" },
      {
        kind: "llm",
        provider: "anthropic",
        model: anthropicModel,
        key: "sk-ant-longenough",
      }
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      key: {
        kind: "llm",
        provider: "anthropic",
        model: anthropicModel,
        last4: "ough",
      },
    });
    expect(saveProviderKey).toHaveBeenCalledTimes(1);
  });

  it("validates then saves a valid ElevenLabs (TTS) key", async () => {
    validateTtsKey.mockResolvedValue(true);
    saveProviderKey.mockResolvedValue({
      kind: "tts",
      provider: "elevenlabs",
      last4: "_key",
    });
    const res = await put(
      { id: "u1" },
      { kind: "tts", key: "sk_elevenlabs_key" }
    );
    expect(res.status).toBe(200);
    expect(validateTtsKey).toHaveBeenCalledWith("sk_elevenlabs_key");
    expect(saveProviderKey).toHaveBeenCalledTimes(1);
  });
});

describe("DELETE /settings/keys", () => {
  it("400s on a missing/invalid kind", async () => {
    const res = await appWith({ id: "u1" }).request("/settings/keys", {
      method: "DELETE",
    });
    expect(res.status).toBe(400);
    expect(deleteProviderKey).not.toHaveBeenCalled();
  });

  it("deletes the caller's key of the given kind", async () => {
    deleteProviderKey.mockResolvedValue(undefined);
    const res = await appWith({ id: "u1" }).request("/settings/keys?kind=llm", {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(deleteProviderKey).toHaveBeenCalledWith("u1", "llm");
  });
});
