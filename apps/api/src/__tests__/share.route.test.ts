import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getShareByToken, signDownloadUrl, signMediaUrl } = vi.hoisted(() => ({
  getShareByToken: vi.fn(),
  signDownloadUrl: vi.fn(),
  signMediaUrl: vi.fn(),
}));

vi.mock("../lib/media.ts", () => ({ signDownloadUrl, signMediaUrl }));
vi.mock("../services/shares.ts", () => ({ getShareByToken }));

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
