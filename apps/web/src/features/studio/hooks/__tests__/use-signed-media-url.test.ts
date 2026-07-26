import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch }));

const { useSignedMediaUrl } = await import("../use-signed-media-url.ts");

const REFRESH_MS = 50 * 60 * 1000;

/** The module-level presign cache is shared across every hook instance by
 * design, so each test needs a key nothing else has used. */
let keyCounter = 0;
function uniqueKey() {
  keyCounter += 1;
  return `videos/c1/scene-${keyCounter}.mp4`;
}

describe("useSignedMediaUrl", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiFetch.mockResolvedValue({ url: "https://r2.example/signed.mp4" });
  });

  it("resolves a key into a presigned URL", async () => {
    const key = uniqueKey();

    const { result } = renderHook(() => useSignedMediaUrl(key));

    await waitFor(() =>
      expect(result.current.url).toBe("https://r2.example/signed.mp4")
    );
    expect(apiFetch).toHaveBeenCalledWith(
      `/api/media/sign?key=${encodeURIComponent(key)}`
    );
  });

  it("stays undefined and quiet without a key", () => {
    const { result } = renderHook(() => useSignedMediaUrl(undefined));

    expect(result.current.url).toBeUndefined();
    expect(result.current.error).toBe(false);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("serves a second consumer of the same key from cache", async () => {
    const key = uniqueKey();
    const first = renderHook(() => useSignedMediaUrl(key));
    await waitFor(() => expect(first.result.current.url).toBeDefined());
    apiFetch.mockClear();

    // The player and every chat card referencing this key must share one
    // request, not re-sign per component.
    const second = renderHook(() => useSignedMediaUrl(key));

    expect(second.result.current.url).toBe("https://r2.example/signed.mp4");
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("coalesces concurrent requests for the same key", async () => {
    const key = uniqueKey();

    const first = renderHook(() => useSignedMediaUrl(key));
    const second = renderHook(() => useSignedMediaUrl(key));

    await waitFor(() => expect(first.result.current.url).toBeDefined());
    await waitFor(() => expect(second.result.current.url).toBeDefined());
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it("re-signs once the cached presign is close to expiring", async () => {
    const key = uniqueKey();
    const first = renderHook(() => useSignedMediaUrl(key));
    await waitFor(() => expect(first.result.current.url).toBeDefined());
    apiFetch.mockClear();
    apiFetch.mockResolvedValue({ url: "https://r2.example/fresh.mp4" });

    const now = vi.spyOn(Date, "now");
    now.mockReturnValue(Date.now() + REFRESH_MS + 1000);

    const second = renderHook(() => useSignedMediaUrl(key));

    await waitFor(() =>
      expect(second.result.current.url).toBe("https://r2.example/fresh.mp4")
    );
    now.mockRestore();
  });

  it("flags an error when signing fails", async () => {
    apiFetch.mockRejectedValue(new Error("403"));

    const { result } = renderHook(() => useSignedMediaUrl(uniqueKey()));

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.url).toBeUndefined();
  });

  it("re-resolves when the key changes", async () => {
    const firstKey = uniqueKey();
    const secondKey = uniqueKey();
    const { result, rerender } = renderHook(
      ({ key }) => useSignedMediaUrl(key),
      { initialProps: { key: firstKey } }
    );
    await waitFor(() => expect(result.current.url).toBeDefined());

    apiFetch.mockResolvedValue({ url: "https://r2.example/second.mp4" });
    rerender({ key: secondKey });

    await waitFor(() =>
      expect(result.current.url).toBe("https://r2.example/second.mp4")
    );
  });
});
