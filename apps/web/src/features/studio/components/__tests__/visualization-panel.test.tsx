import { render, screen } from "@testing-library/react";
import type { ChatStatus } from "ai";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/studio/hooks/use-signed-media-url", () => ({
  useSignedMediaUrl: () => ({ error: false, url: "https://r2.test/v.mp4" }),
}));
vi.mock("@/features/studio/components/video-player", () => ({
  VideoPlayer: () => <div data-testid="player" />,
}));

const { VisualizationPanel } = await import("../visualization-panel.tsx");

function panel(overrides: { status: ChatStatus; videoKey?: string }) {
  return render(
    <VisualizationPanel
      seed="conversation-1"
      title="How Vaccines Train Immunity"
      {...overrides}
    />
  );
}

const CREATING = /Creating your explainer/i;
const STOPPED_EARLY = /The turn stopped early/i;
const STOPPED = /stopped early/i;

describe("VisualizationPanel", () => {
  it("keeps the rendering animation while a turn is in flight", () => {
    panel({ status: "streaming" });
    expect(screen.getByText(CREATING)).toBeInTheDocument();
  });

  it("keeps the rendering animation between turns", () => {
    // "ready" is the ordinary waiting-on-you state (an unanswered plan, a
    // question) and this panel only mounts once a conversation has messages, so
    // a video is still coming. Showing a static empty state here was wrong.
    panel({ status: "ready" });

    expect(screen.getByText(CREATING)).toBeInTheDocument();
    expect(screen.queryByText(STOPPED)).not.toBeInTheDocument();
  });

  it("stops promising a video once the turn has failed", () => {
    // The regression this exists for: a cut-off turn left the panel animating
    // forever, telling the user their explainer was on its way.
    panel({ status: "error" });

    expect(screen.queryByText(CREATING)).not.toBeInTheDocument();
    expect(screen.getByText(STOPPED_EARLY)).toBeInTheDocument();
  });

  it("shows the player once a video exists, whatever the turn is doing", () => {
    panel({ status: "error", videoKey: "videos/one.mp4" });

    expect(screen.getByTestId("player")).toBeInTheDocument();
    expect(screen.queryByText(STOPPED)).not.toBeInTheDocument();
  });
});
