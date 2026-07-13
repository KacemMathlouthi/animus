import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/logger.ts", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

const { validateLlmKey, validateTtsKey } = await import(
  "../services/provider-validation.ts"
);

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function okResponse(ok: boolean) {
  return { ok } as Response;
}

/** The first fetch call's args, cast to the tuple shape the tests assert on. */
function firstCall(): [string, { headers: Record<string, string> }] {
  return fetchMock.mock.calls[0] as [
    string,
    { headers: Record<string, string> },
  ];
}

describe("validateLlmKey", () => {
  it("calls the Anthropic models endpoint with the key header", async () => {
    fetchMock.mockResolvedValue(okResponse(true));
    await expect(validateLlmKey("anthropic", "sk-ant-x")).resolves.toBe(true);

    const [url, init] = firstCall();
    expect(url).toBe("https://api.anthropic.com/v1/models");
    expect(init.headers["x-api-key"]).toBe("sk-ant-x");
    expect(init.headers["anthropic-version"]).toBeTruthy();
  });

  it("uses a Bearer header for OpenAI", async () => {
    fetchMock.mockResolvedValue(okResponse(true));
    await validateLlmKey("openai", "sk-openai");
    const [url, init] = firstCall();
    expect(url).toBe("https://api.openai.com/v1/models");
    expect(init.headers.authorization).toBe("Bearer sk-openai");
  });

  it("passes the key as a query param for Google", async () => {
    fetchMock.mockResolvedValue(okResponse(true));
    await validateLlmKey("google", "aiza key/with+chars");
    const [url] = firstCall();
    expect(url).toContain("generativelanguage.googleapis.com");
    expect(url).toContain(encodeURIComponent("aiza key/with+chars"));
  });

  it("returns false on a non-2xx response", async () => {
    fetchMock.mockResolvedValue(okResponse(false));
    await expect(validateLlmKey("anthropic", "bad")).resolves.toBe(false);
  });

  it("never logs the key when a Google validation request throws", async () => {
    const { logger } = await import("../lib/logger.ts");
    const warn = vi.mocked(logger.warn);
    warn.mockClear();
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(validateLlmKey("google", "AIza-super-secret")).resolves.toBe(
      false
    );

    expect(warn).toHaveBeenCalledTimes(1);
    // The key rides in the Google URL's query string; assert nothing logged
    // contains it (endpoint is origin+path only, error reduced to its name).
    expect(JSON.stringify(warn.mock.calls[0])).not.toContain("super-secret");
  });

  it("returns false when the request throws (network/timeout)", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    await expect(validateLlmKey("openai", "sk")).resolves.toBe(false);
  });
});

describe("validateTtsKey", () => {
  it("calls the ElevenLabs user endpoint with the xi-api-key header", async () => {
    fetchMock.mockResolvedValue(okResponse(true));
    await expect(validateTtsKey("sk_eleven")).resolves.toBe(true);
    const [url, init] = firstCall();
    expect(url).toBe("https://api.elevenlabs.io/v1/user");
    expect(init.headers["xi-api-key"]).toBe("sk_eleven");
  });

  it("returns false on failure", async () => {
    fetchMock.mockResolvedValue(okResponse(false));
    await expect(validateTtsKey("bad")).resolves.toBe(false);
  });
});
