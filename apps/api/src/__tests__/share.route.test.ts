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
