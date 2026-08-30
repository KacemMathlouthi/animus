import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StudioPrompt } from "@/features/studio/components/studio-prompt";

const SUBMIT = /submit/i;
const STOP = /stop/i;
const ATTACHMENT = /attach|upload|file/i;
const MESSAGE_BOX = "Message the agent";

describe("StudioPrompt", () => {
  it("submits the typed text and clears itself", async () => {
    const onSubmit = vi.fn();
    render(<StudioPrompt onSubmit={onSubmit} status="ready" />);

    const box = screen.getByRole("textbox", { name: MESSAGE_BOX });
    await userEvent.type(box, "Explain the Fourier transform");
    await userEvent.click(screen.getByRole("button", { name: SUBMIT }));

    expect(onSubmit).toHaveBeenCalledWith("Explain the Fourier transform");
    expect(box).toHaveValue("");
  });

  it("submits on Enter", async () => {
    const onSubmit = vi.fn();
    render(<StudioPrompt onSubmit={onSubmit} status="ready" />);

    await userEvent.type(
      screen.getByRole("textbox", { name: MESSAGE_BOX }),
      "Explain entropy{Enter}"
    );

    expect(onSubmit).toHaveBeenCalledWith("Explain entropy");
  });

  it("keeps submit disabled until there is real text", async () => {
    render(<StudioPrompt onSubmit={vi.fn()} status="ready" />);
    expect(screen.getByRole("button", { name: SUBMIT })).toBeDisabled();

    await userEvent.type(
      screen.getByRole("textbox", { name: MESSAGE_BOX }),
      "   "
    );

    expect(screen.getByRole("button", { name: SUBMIT })).toBeDisabled();
  });

  it("does not send a new message while a turn is streaming", async () => {
    const onSubmit = vi.fn();
    render(<StudioPrompt onSubmit={onSubmit} status="streaming" />);

    await userEvent.type(
      screen.getByRole("textbox", { name: MESSAGE_BOX }),
      "another question{Enter}"
    );

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("offers stop instead of submit while streaming", async () => {
    const onStop = vi.fn();
    render(
      <StudioPrompt onStop={onStop} onSubmit={vi.fn()} status="streaming" />
    );

    await userEvent.click(screen.getByRole("button", { name: STOP }));

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("renders the caller's placeholder", () => {
    render(
      <StudioPrompt
        onSubmit={vi.fn()}
        placeholder="Explain how…"
        status="ready"
      />
    );

    expect(screen.getByPlaceholderText("Explain how…")).toBeInTheDocument();
  });

  it("offers no reachable file-attachment control", () => {
    // The vendored PromptInput still renders its file input unconditionally,
    // so assert nothing opens it. jsdom loads no CSS, so visibility itself
    // cannot be asserted here.
    render(<StudioPrompt onSubmit={vi.fn()} status="ready" />);

    expect(screen.queryByRole("button", { name: ATTACHMENT })).toBeNull();
    expect(screen.getByLabelText("Upload files")).toHaveClass("hidden");
  });
});
