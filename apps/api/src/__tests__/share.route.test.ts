import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getShareByToken, signDownloadUrl, signMediaUrl } = vi.hoisted(() => ({
  getShareByToken: vi.fn(),
  signDownloadUrl: vi.fn(),
  signMediaUrl: vi.fn(),
}));

vi.mock("../lib/media.ts", () => ({ signDownloadUrl, signMediaUrl }));
vi.mock("../services/shares.ts", () => ({ getShareByToken }));
vi.mock("@animus/core/env", () => ({
  getServerEnv: () => ({
    webOrigin: "https://web.test",
    apiOrigin: "https://api.test",
  }),
}));

const { shareRoute } = await import("../routes/share.ts");

function app() {
  const base = new Hono();
  base.route("/share", shareRoute);
  return base;
}

beforeEach(() => {
  getShareByToken.mockReset();
  signDownloadUrl.mockReset();
  signMediaUrl.mockReset();
});

describe("GET /share/:token", () => {
  it("404s for an unknown token without signing anything", async () => {
    getShareByToken.mockResolvedValue(null);

    const res = await app().request("/share/nope");

    expect(res.status).toBe(404);
    expect(signMediaUrl).not.toHaveBeenCalled();
  });

  it("returns the title with fresh playback and download URLs", async () => {
    getShareByToken.mockResolvedValue({
      token: "tok123",
      videoKey: "videos/conv1/Scene-ab12cd34.mp4",
      title: "My explainer",
    });
    signMediaUrl.mockResolvedValue("https://signed/play");
    signDownloadUrl.mockResolvedValue("https://signed/download");

    const res = await app().request("/share/tok123");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      title: "My explainer",
      videoUrl: "https://signed/play",
      downloadUrl: "https://signed/download",
    });
    expect(signMediaUrl).toHaveBeenCalledWith(
      "videos/conv1/Scene-ab12cd34.mp4"
    );
    expect(signDownloadUrl).toHaveBeenCalledWith(
      "videos/conv1/Scene-ab12cd34.mp4",
      "My explainer"
    );
  });
});

describe("GET /share/:token/og.png", () => {
  it("404s for an unknown token", async () => {
    getShareByToken.mockResolvedValue(null);

    const res = await app().request("/share/nope/og.png");

    expect(res.status).toBe(404);
  });

  it("renders a PNG share card for a known token", async () => {
    getShareByToken.mockResolvedValue({
      token: "tok123",
      videoKey: "videos/conv1/Scene-ab12cd34.mp4",
      title: "My explainer",
    });

    const res = await app().request("/share/tok123/og.png");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toContain("max-age");
    const bytes = new Uint8Array(await res.arrayBuffer());
    // PNG magic number.
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([137, 80, 78, 71]);
    // A real card is far from empty.
    expect(bytes.length).toBeGreaterThan(1000);
  });
});

describe("GET /share/:token/video.mp4", () => {
  it("302s to a freshly presigned playback URL", async () => {
    getShareByToken.mockResolvedValue({
      token: "tok123",
      videoKey: "videos/conv1/Scene-ab12cd34.mp4",
      title: "My explainer",
    });
    signMediaUrl.mockResolvedValue("https://signed/play.mp4");

    const res = await app().request("/share/tok123/video.mp4", {
      redirect: "manual",
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://signed/play.mp4");
    expect(signMediaUrl).toHaveBeenCalledWith(
      "videos/conv1/Scene-ab12cd34.mp4"
    );
  });

  it("404s for an unknown token", async () => {
    getShareByToken.mockResolvedValue(null);
    const res = await app().request("/share/nope/video.mp4", {
      redirect: "manual",
    });
    expect(res.status).toBe(404);
    expect(signMediaUrl).not.toHaveBeenCalled();
  });
});

describe("GET /share/:token/embed", () => {
  it("serves an iframe player pointing at the share's video + poster", async () => {
    getShareByToken.mockResolvedValue({
      token: "tok123",
      videoKey: "videos/conv1/Scene-ab12cd34.mp4",
      title: "My explainer",
    });

    const res = await app().request("/share/tok123/embed");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain('src="/api/share/tok123/video.mp4"');
    expect(html).toContain('poster="/api/share/tok123/og.png"');
    expect(html).toContain("<video");
  });

  it("404s for an unknown token", async () => {
    getShareByToken.mockResolvedValue(null);
    const res = await app().request("/share/nope/embed");
    expect(res.status).toBe(404);
  });
});

describe("GET /share/:token/page", () => {
  const SHELL =
    "<!doctype html><html><head><!-- share-meta:start --><title>animus</title><!-- share-meta:end --></head><body></body></html>";
  const fetchShell = vi.fn();

  vi.stubGlobal("fetch", fetchShell);

  // NOTE: the SPA shell is cached at module level for 5 minutes, so test order
  // matters here: the failure case runs first (a failed fetch is not cached),
  // then the success cases prime and reuse the cache.
  it("503s when the SPA shell cannot be fetched (and does not cache)", async () => {
    fetchShell.mockResolvedValue(new Response("nope", { status: 500 }));
    getShareByToken.mockResolvedValue(null);

    const res = await app().request("/share/tok123/page");

    expect(res.status).toBe(503);
  });

  it("serves the shell with injected per-share meta for a known token", async () => {
    fetchShell.mockResolvedValue(new Response(SHELL, { status: 200 }));
    getShareByToken.mockResolvedValue({
      token: "tok123",
      videoKey: "videos/conv1/Scene-ab12cd34.mp4",
      title: 'My <"explainer">',
    });

    const res = await app().request("/share/tok123/page");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.headers.get("cache-control")).toContain("max-age");
    const html = await res.text();
    // Assets resolve against the API; only the human-facing page is the web.
    expect(html).toContain(
      '<meta property="og:image" content="https://api.test/api/share/tok123/og.png"/>'
    );
    expect(html).toContain(
      '<meta property="og:video" content="https://api.test/api/share/tok123/video.mp4"/>'
    );
    expect(html).toContain(
      '<meta name="twitter:player" content="https://api.test/api/share/tok123/embed"/>'
    );
    expect(html).toContain(
      '<meta property="og:url" content="https://web.test/v/tok123"/>'
    );
    expect(html).toContain("My &lt;&quot;explainer&quot;&gt;");
    // The SPA shell is intact around the injected block.
    expect(html).toContain("<body></body>");
    expect(fetchShell).toHaveBeenCalledWith(
      "https://web.test/",
      expect.anything()
    );
  });

  it("serves the plain shell for an unknown token (SPA renders not-found)", async () => {
    getShareByToken.mockResolvedValue(null);

    const res = await app().request("/share/nope/page");

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).not.toContain("og:image");
    expect(html).toContain("<body></body>");
  });

  it("reuses the cached shell instead of refetching per request", async () => {
    fetchShell.mockClear();
    getShareByToken.mockResolvedValue(null);

    await app().request("/share/nope/page");
    await app().request("/share/nope/page");

    expect(fetchShell).not.toHaveBeenCalled();
  });

  it("never points a crawler asset at the web origin", async () => {
    // Prod dropped the web's /api proxy, so a web-origin asset URL falls
    // through to the SPA catch-all and answers 200 text/html. A crawler asking
    // for a PNG got HTML, and nothing errored.
    fetchShell.mockResolvedValue(new Response(SHELL, { status: 200 }));
    getShareByToken.mockResolvedValue({
      token: "tok123",
      videoKey: "videos/conv1/Scene-ab12cd34.mp4",
      title: "Fourier",
    });

    const html = await (await app().request("/share/tok123/page")).text();

    expect(html).not.toContain("https://web.test/api/");
  });
});
