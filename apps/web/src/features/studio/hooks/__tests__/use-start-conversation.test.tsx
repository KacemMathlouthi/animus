import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createConversation, navigate } = vi.hoisted(() => ({
  createConversation: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@/lib/conversations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/conversations")>();
  return { ...actual, createConversation };
});
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => navigate };
});

const { MemoryRouter } = await import("react-router");
const { useStartConversation } = await import("../use-start-conversation.ts");

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe("useStartConversation", () => {
  beforeEach(() => {
    createConversation.mockReset();
    createConversation.mockResolvedValue({ id: "conversation-1" });
    navigate.mockReset();
  });

  it("creates a conversation and navigates in with the prompt", async () => {
    const { result } = renderHook(() => useStartConversation(), { wrapper });

    act(() => result.current.start("Explain the Fourier transform"));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/studio/c/conversation-1", {
        state: { prompt: "Explain the Fourier transform" },
      })
    );
    expect(createConversation).toHaveBeenCalledTimes(1);
  });

  it("announces the new conversation so the sidebar picks it up", async () => {
    const listener = vi.fn();
    window.addEventListener("animus:conversations-changed", listener);
    const { result } = renderHook(() => useStartConversation(), { wrapper });

    act(() => result.current.start("Explain entropy"));

    await waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
    window.removeEventListener("animus:conversations-changed", listener);
  });

  it("reports creating while the request is in flight", async () => {
    const { result } = renderHook(() => useStartConversation(), { wrapper });
    expect(result.current.creating).toBe(false);

    act(() => result.current.start("Explain entropy"));

    expect(result.current.creating).toBe(true);
    await waitFor(() => expect(navigate).toHaveBeenCalled());
  });

  it("ignores a blank prompt", () => {
    const { result } = renderHook(() => useStartConversation(), { wrapper });

    act(() => result.current.start("   "));

    expect(createConversation).not.toHaveBeenCalled();
    expect(result.current.creating).toBe(false);
  });

  it("surfaces a failure and lets the user try again", async () => {
    createConversation.mockRejectedValue(new Error("500"));
    const { result } = renderHook(() => useStartConversation(), { wrapper });

    act(() => result.current.start("Explain entropy"));

    await waitFor(() =>
      expect(result.current.error).toBe(
        "Could not create a conversation. Try again."
      )
    );
    // Otherwise the prompt would stay locked behind a spinner.
    expect(result.current.creating).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("clears a previous error on the next attempt", async () => {
    createConversation.mockRejectedValue(new Error("500"));
    const { result } = renderHook(() => useStartConversation(), { wrapper });
    act(() => result.current.start("Explain entropy"));
    await waitFor(() => expect(result.current.error).not.toBeNull());

    createConversation.mockResolvedValue({ id: "conversation-2" });
    act(() => result.current.start("Explain entropy"));

    await waitFor(() => expect(result.current.error).toBeNull());
  });
});
