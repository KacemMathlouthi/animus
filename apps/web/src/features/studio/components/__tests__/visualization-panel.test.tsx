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
const NO_VIDEO = /No video yet/i;
const STOPPED_EARLY = /The turn stopped early/i;
const STOPPED = /stopped early/i;

describe("VisualizationPanel", () => {
  it("promises a video only while a turn is actually running", () => {
    panel({ status: "streaming" });
    expect(screen.getByText(CREATING)).toBeInTheDocument();
  });

  it("says nothing is running on an untouched conversation", () => {
    // It used to claim "Creating your explainer" here too, before the user had
    // asked for anything at all.
    panel({ status: "ready" });

    expect(screen.queryByText(CREATING)).not.toBeInTheDocument();
    expect(screen.getByText(NO_VIDEO)).toBeInTheDocument();
  });

  it("says the turn stopped early when it ended in an error", () => {
    // The regression: a cut-off turn left this panel promising a video forever.
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
