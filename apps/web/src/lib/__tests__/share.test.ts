import { describe, expect, it, vi } from "vitest";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch }));

const { createShareLink, downloadVideo } = await import("@/lib/share");

describe("createShareLink", () => {
  it("mints a share and returns the public URL to post", async () => {
    apiFetch.mockResolvedValue({ token: "abc123" });

    const url = await createShareLink("videos/c1/scene.mp4");

    expect(apiFetch).toHaveBeenCalledWith("/api/media/share", {
      method: "POST",
      body: JSON.stringify({ videoKey: "videos/c1/scene.mp4" }),
    });
    expect(url).toBe(`${window.location.origin}/v/abc123`);
  });

  it("propagates a failure rather than returning a broken link", async () => {
    apiFetch.mockRejectedValue(new Error("403"));

    await expect(createShareLink("videos/c1/scene.mp4")).rejects.toThrow("403");
  });
});

describe("downloadVideo", () => {
  it("encodes the key and filename, then clicks a throwaway anchor", async () => {
    apiFetch.mockResolvedValue({ url: "https://r2.example/signed.mp4" });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {
        // jsdom would try to navigate
      });

    await downloadVideo("videos/c1/my scene.mp4", "How Vaccines Work");

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/media/download?key=videos%2Fc1%2Fmy%20scene.mp4&filename=How%20Vaccines%20Work"
    );
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

  it("leaves no anchor behind in the document", async () => {
    apiFetch.mockResolvedValue({ url: "https://r2.example/signed.mp4" });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      // no-op
    });

    await downloadVideo("videos/c1/scene.mp4", "Title");

    expect(document.querySelectorAll("a")).toHaveLength(0);
  });
});
