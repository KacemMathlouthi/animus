import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AnimusUIMessage } from "@/features/studio/types";

// The session hook only drives the user avatar; these tests are all about the
// assistant's tool parts.
vi.mock("@/lib/auth-client", () => ({ useSession: () => ({ data: null }) }));
// The rendered-video card resolves an R2 key over the network.
vi.mock("@/features/studio/hooks/use-signed-media-url", () => ({
  useSignedMediaUrl: () => ({ error: false, url: undefined }),
}));

const { ChatMessage } = await import("../chat-message.tsx");

/** An assistant message carrying a single tool part. */
function toolMessage(part: unknown): AnimusUIMessage {
  return {
    id: "msg-1",
    parts: [part],
    role: "assistant",
  } as AnimusUIMessage;
}

function renderPart(part: unknown, isStreaming: boolean) {
  return render(
    <ChatMessage
      isStreaming={isStreaming}
      message={toolMessage(part)}
      respondToTool={vi.fn()}
    />
  );
}

const RENDERING = /Rendering IntroScene/i;
const UNFINISHED = /Render didn't finish/i;
const PICK_UP = /ended before this step reported back/i;
const COMMAND_UNFINISHED = /Command didn't finish/i;
const WRITE_UNFINISHED = /Write didn't finish/i;
const NO_REASON = /failed without a reason/i;
const ANY_UNFINISHED = /didn't finish/i;

describe("ChatMessage tool parts", () => {
  it("shows a running render while the turn is still streaming", () => {
    renderPart(
      {
        input: { file: "scene.py", quality: "low", scene: "IntroScene" },
        state: "input-available",
        toolCallId: "call-1",
        type: "tool-renderScene",
      },
      true
    );

    expect(screen.getByText(RENDERING)).toBeInTheDocument();
    expect(screen.queryByText(UNFINISHED)).not.toBeInTheDocument();
  });

  it("marks the same render unfinished once the turn is no longer streaming", () => {
    // The regression: a turn cut off by the platform's request cap leaves the
    // part in exactly this state, and it used to shimmer forever — including on
    // every later page load.
    renderPart(
      {
        input: { file: "scene.py", quality: "low", scene: "IntroScene" },
        state: "input-available",
        toolCallId: "call-1",
        type: "tool-renderScene",
      },
      false
    );

    expect(screen.getByText(UNFINISHED)).toBeInTheDocument();
    expect(screen.getByText(PICK_UP)).toBeInTheDocument();
    expect(screen.queryByText(RENDERING)).not.toBeInTheDocument();
  });

  it("surfaces the reason a tool call threw", () => {
    renderPart(
      {
        errorText: "Sandbox timed out after 600s",
        input: { file: "scene.py", quality: "low", scene: "IntroScene" },
        state: "output-error",
        toolCallId: "call-1",
        type: "tool-renderScene",
      },
      true
    );

    expect(screen.getByText(UNFINISHED)).toBeInTheDocument();
    expect(
      screen.getByText("Sandbox timed out after 600s")
    ).toBeInTheDocument();
  });

  it("reports a failure even while the turn is still streaming", () => {
    // output-error is terminal for that step; a live turn must not hide it.
    renderPart(
      {
        errorText: "boom",
        input: { command: "manim render scene.py" },
        state: "output-error",
        toolCallId: "call-2",
        type: "tool-runCommand",
      },
      true
    );

    expect(screen.getByText(COMMAND_UNFINISHED)).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
  });

  it("falls back to generic wording when a failure carries no reason", () => {
    renderPart(
      {
        input: { path: "scene.py" },
        state: "output-error",
        toolCallId: "call-3",
        type: "tool-writeFile",
      },
      true
    );

    expect(screen.getByText(WRITE_UNFINISHED)).toBeInTheDocument();
    expect(screen.getByText(NO_REASON)).toBeInTheDocument();
  });

  it("no longer claims success for a failed write", () => {
    // Every branch used to render its success card for any state that was not
    // input-streaming, so a thrown writeFile read as "Wrote file".
    renderPart(
      {
        errorText: "permission denied",
        input: { path: "scene.py" },
        state: "output-error",
        toolCallId: "call-4",
        type: "tool-writeFile",
      },
      true
    );

    expect(screen.queryByText("Wrote file")).not.toBeInTheDocument();
  });

  it("renders the success card when the step completed", () => {
    renderPart(
      {
        input: { content: "x", path: "scene.py" },
        output: { bytes: 1, path: "scene.py" },
        state: "output-available",
        toolCallId: "call-5",
        type: "tool-writeFile",
      },
      false
    );

    expect(screen.getByText("Wrote file")).toBeInTheDocument();
  });

  it("keeps an unanswered plan answerable after the turn ends", () => {
    // Human-in-the-loop tools must never read as unfinished: "waiting for you"
    // stays valid once the turn is over, and answering starts the next turn.
    renderPart(
      {
        input: { scenes: [], summary: "A plan", title: "Vaccines" },
        state: "input-available",
        toolCallId: "call-6",
        type: "tool-finalizeVideoPlan",
      },
      false
    );

    expect(screen.queryByText(ANY_UNFINISHED)).not.toBeInTheDocument();
    expect(screen.getByText("Vaccines")).toBeInTheDocument();
  });
});
