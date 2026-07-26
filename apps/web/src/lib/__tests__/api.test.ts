import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/api";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("apiFetch", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefixes the API origin and sends the session cookie", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await apiFetch("/api/conversations");

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/api/conversations`,
      expect.objectContaining({
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("returns the parsed body", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ conversations: [], total: 0 }));

    await expect(apiFetch("/api/conversations")).resolves.toEqual({
      conversations: [],
      total: 0,
    });
  });

  it("passes the caller's method and body through", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await apiFetch("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ title: "x" }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/api/conversations`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "x" }),
      })
    );
  });

  it("lets the caller override a default header", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await apiFetch("/api/conversations", {
      headers: { "Content-Type": "text/plain" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/api/conversations`,
      expect.objectContaining({
        headers: { "Content-Type": "text/plain" },
      })
    );
  });

  it("throws an ApiError carrying the status and the server's code", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { code: "OUT_OF_CREDITS", message: "You are out of credits" },
        402
      )
    );

    // The code is what the depletion dialog keys off, so it has to survive.
    await expect(apiFetch("/api/chat")).rejects.toMatchObject({
      name: "ApiError",
      status: 402,
      message: "You are out of credits",
      code: "OUT_OF_CREDITS",
    });
  });

  it("falls back to a generic message when the error body has none", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));

    await expect(apiFetch("/api/conversations")).rejects.toThrow(
      "Request to /api/conversations failed (500)"
    );
  });

  it("survives an error response that is not JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error("not json")),
    } as unknown as Response);

    const error: unknown = await apiFetch("/api/conversations").catch(
      (thrown: unknown) => thrown
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(502);
    expect((error as ApiError).code).toBeUndefined();
  });

  it("propagates a network failure untouched", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiFetch("/api/conversations")).rejects.toThrow(
      "Failed to fetch"
    );
  });
});
