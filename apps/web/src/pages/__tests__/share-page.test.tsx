import type { PublicShareResponse } from "@animus/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch, useSession } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  useSession: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ apiFetch }));
// The share page is public, but its CTA still asks the auth client where to
// point; the real client would fire a network request on mount.
vi.mock("@/lib/auth-client", () => ({ useSession }));

const { MemoryRouter, Route, Routes } = await import("react-router");
const { SharePage } = await import("../share-page.tsx");

const TOKEN = "95693ec0e06348babadcee9e346eb907";

const DOWNLOAD = /download/i;
const START_CREATING = /start creating/i;
const COPY_LINK = /copy link/i;
const COPIED = /copied/i;

const share: PublicShareResponse = {
  title: "How Vaccines Train Immunity",
  videoUrl: "https://r2.example/video.mp4?sig=abc",
  downloadUrl: "https://r2.example/video.mp4?sig=abc&download=1",
} as PublicShareResponse;

function renderAt(token = TOKEN) {
  return render(
    <MemoryRouter initialEntries={[`/v/${token}`]}>
      <Routes>
        <Route element={<SharePage />} path="/v/:token" />
        <Route element={<p>studio</p>} path="/studio" />
        <Route element={<p>auth</p>} path="/auth" />
      </Routes>
    </MemoryRouter>
  );
}

describe("SharePage", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    useSession.mockReturnValue({ data: null });
  });

  it("fetches the share by the token in the URL", async () => {
    apiFetch.mockResolvedValue(share);

    renderAt();

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(`/api/share/${TOKEN}`)
    );
  });

  it("renders the video, the title and the download link once loaded", async () => {
    apiFetch.mockResolvedValue(share);

    renderAt();

    expect(
      await screen.findByRole("heading", { name: share.title })
    ).toBeInTheDocument();

    const download = screen.getByRole("link", { name: DOWNLOAD });
    expect(download).toHaveAttribute("href", share.downloadUrl);
    expect(download).toHaveAttribute("download");
    expect(document.title).toBe(`${share.title} · animus`);
  });

  it("shows the unavailable state when the share cannot be loaded", async () => {
    apiFetch.mockRejectedValue(new Error("410 gone"));

    renderAt();

    expect(
      await screen.findByText("This video isn't available")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: DOWNLOAD })
    ).not.toBeInTheDocument();
    expect(document.title).toBe("Video unavailable · animus");
  });

  it("points a signed-out visitor's CTA at the auth page", async () => {
    apiFetch.mockResolvedValue(share);

    renderAt();

    const cta = await screen.findByRole("link", { name: START_CREATING });
    expect(cta).toHaveAttribute("href", "/auth");
  });

  it("points a signed-in visitor's CTA straight at the studio", async () => {
    useSession.mockReturnValue({ data: { user: { id: "user-1" } } });
    apiFetch.mockResolvedValue(share);

    renderAt();

    const cta = await screen.findByRole("link", { name: START_CREATING });
    expect(cta).toHaveAttribute("href", "/studio");
  });

  it("copies the page URL and confirms it", async () => {
    apiFetch.mockResolvedValue(share);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    renderAt();
    const copy = await screen.findByRole("button", { name: COPY_LINK });
    await userEvent.click(copy);

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(
      await screen.findByRole("button", { name: COPIED })
    ).toBeInTheDocument();
  });

  it("stays usable when the clipboard is blocked", async () => {
    apiFetch.mockResolvedValue(share);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("denied")),
      },
    });

    renderAt();
    const copy = await screen.findByRole("button", { name: COPY_LINK });
    await userEvent.click(copy);

    // No unhandled rejection, no "Copied" lie — the URL is still in the bar.
    expect(screen.getByRole("button", { name: COPY_LINK })).toBeInTheDocument();
  });
});
