import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConversationDetail } from "@/lib/conversations";

const { getConversation } = vi.hoisted(() => ({ getConversation: vi.fn() }));
vi.mock("@/lib/conversations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/conversations")>();
  return { ...actual, getConversation };
});

const { useConversationDetail } = await import("../use-conversation-detail.ts");

const POLL_MS = 2500;
const CHAT_ID = "conversation-1";

function detail(
  title: string,
  titleStatus?: "pending" | "ready"
): ConversationDetail {
  return {
    conversation: {
      id: CHAT_ID,
      title,
      titleStatus,
    } as ConversationDetail["conversation"],
    messages: [],
  };
}

describe("useConversationDetail", () => {
  beforeEach(() => {
    getConversation.mockReset();
    getConversation.mockResolvedValue(detail("New video", "ready"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads the conversation on mount", async () => {
    const { result } = renderHook(() => useConversationDetail(CHAT_ID));

    expect(result.current.detail).toBeNull();
    await waitFor(() => expect(result.current.detail).not.toBeNull());
    expect(getConversation).toHaveBeenCalledWith(CHAT_ID);
    expect(result.current.error).toBe(false);
  });

  it("flags an error when the conversation cannot be loaded", async () => {
    getConversation.mockRejectedValue(new Error("404"));

    const { result } = renderHook(() => useConversationDetail(CHAT_ID));

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.detail).toBeNull();
  });

  it("reloads when the conversation set changes elsewhere", async () => {
    const { result } = renderHook(() => useConversationDetail(CHAT_ID));
    await waitFor(() => expect(result.current.detail).not.toBeNull());

    getConversation.mockResolvedValue(detail("Renamed", "ready"));
    act(() => {
      window.dispatchEvent(new Event("animus:conversations-changed"));
    });

    await waitFor(() =>
      expect(result.current.detail?.conversation.title).toBe("Renamed")
    );
  });

  it("clears a previous error once a reload succeeds", async () => {
    getConversation.mockRejectedValue(new Error("500"));
    const { result } = renderHook(() => useConversationDetail(CHAT_ID));
    await waitFor(() => expect(result.current.error).toBe(true));

    getConversation.mockResolvedValue(detail("Recovered", "ready"));
    act(() => {
      window.dispatchEvent(new Event("animus:conversations-changed"));
    });

    await waitFor(() => expect(result.current.error).toBe(false));
  });

  it("stops listening once unmounted", async () => {
    const { result, unmount } = renderHook(() =>
      useConversationDetail(CHAT_ID)
    );
    await waitFor(() => expect(result.current.detail).not.toBeNull());
    getConversation.mockClear();

    unmount();
    window.dispatchEvent(new Event("animus:conversations-changed"));

    expect(getConversation).not.toHaveBeenCalled();
  });

  it("polls while the title is still being generated", async () => {
    vi.useFakeTimers();
    getConversation.mockResolvedValue(detail("New video", "pending"));

    const { result } = renderHook(() => useConversationDetail(CHAT_ID));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.detail?.conversation.titleStatus).toBe("pending");

    getConversation.mockResolvedValue(detail("Generated Title", "ready"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS);
    });

    expect(result.current.detail?.conversation.title).toBe("Generated Title");
  });

  it("stops polling once the title is ready", async () => {
    vi.useFakeTimers();

    renderHook(() => useConversationDetail(CHAT_ID));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    getConversation.mockClear();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS * 4);
    });

    expect(getConversation).not.toHaveBeenCalled();
  });
});
