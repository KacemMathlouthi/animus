import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnimusUIMessage } from "@/features/studio/types";

// The workspace mounts the chat transcript, the resizable panels and the video
// player. StudioStage's own job is picking which surface to show, so the
// workspace stands in as a marker.
vi.mock("@/features/studio/components/studio-workspace", () => ({
  StudioWorkspace: ({ title }: { title: string }) => (
    <div data-testid="workspace">{title}</div>
  ),
}));

const { StudioStage } = await import("../studio-view.tsx");

const SUBMIT = /submit/i;

function stageProps(overrides: Record<string, unknown> = {}) {
  return {
    phase: "idle" as const,
    messages: [] as AnimusUIMessage[],
    status: "ready" as const,
    title: "How Vaccines Train Immunity",
    seed: "conversation-1",
    respondToTool: vi.fn(),
    onSubmit: vi.fn(),
    onStop: vi.fn(),
    ...overrides,
  };
}

describe("StudioStage", () => {
  it("shows the prompt-first empty state while idle", () => {
    render(<StudioStage {...stageProps()} />);

    expect(
      screen.getByRole("heading", { name: "What do you want to understand?" })
    ).toBeInTheDocument();
    expect(screen.queryByTestId("workspace")).not.toBeInTheDocument();
  });

  it("submits the typed prompt", async () => {
    const onSubmit = vi.fn();
    render(<StudioStage {...stageProps({ onSubmit })} />);

    await userEvent.type(
      screen.getByRole("textbox", { name: "Message the agent" }),
      "Explain the Fourier transform"
    );
    await userEvent.click(screen.getByRole("button", { name: SUBMIT }));

    expect(onSubmit).toHaveBeenCalledWith("Explain the Fourier transform");
  });

  it("shows neither the empty state nor the workspace while loading", () => {
    render(<StudioStage {...stageProps({ phase: "loading" })} />);

    expect(
      screen.queryByRole("heading", {
        name: "What do you want to understand?",
      })
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("workspace")).not.toBeInTheDocument();
  });

  it("hands over to the workspace once the conversation is live", () => {
    render(<StudioStage {...stageProps({ phase: "chat" })} />);

    expect(screen.getByTestId("workspace")).toHaveTextContent(
      "How Vaccines Train Immunity"
    );
  });

  describe("render notification", () => {
    const notification = vi.fn();

    beforeEach(() => {
      notification.mockClear();
      vi.stubGlobal(
        "Notification",
        Object.assign(notification, { permission: "granted" })
      );
      vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("announces a render that finishes while the tab is hidden", () => {
      const { rerender } = render(
        <StudioStage {...stageProps({ phase: "chat" })} />
      );

      rerender(
        <StudioStage
          {...stageProps({ phase: "chat", videoKey: "videos/first.mp4" })}
        />
      );

      expect(notification).toHaveBeenCalledWith(
        "Your explainer is ready",
        expect.objectContaining({ body: "Your video is ready to watch." })
      );
    });

    it("stays quiet while the user is watching the tab", () => {
      vi.spyOn(document, "hidden", "get").mockReturnValue(false);

      const { rerender } = render(
        <StudioStage {...stageProps({ phase: "chat" })} />
      );
      rerender(
        <StudioStage
          {...stageProps({ phase: "chat", videoKey: "videos/first.mp4" })}
        />
      );

      expect(notification).not.toHaveBeenCalled();
    });

    it("does not re-announce a video that was already there on mount", () => {
      const { rerender } = render(
        <StudioStage
          {...stageProps({ phase: "chat", videoKey: "videos/first.mp4" })}
        />
      );
      rerender(
        <StudioStage
          {...stageProps({ phase: "chat", videoKey: "videos/first.mp4" })}
        />
      );

      expect(notification).not.toHaveBeenCalled();
    });
  });
});
