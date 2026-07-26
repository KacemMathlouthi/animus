import type { ConversationSummary } from "@animus/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { listConversations } = vi.hoisted(() => ({
  listConversations: vi.fn(),
}));

// Only the network call is faked — groupConversations is pure and its real
// behaviour is part of what this hook is expected to expose.
vi.mock("@/lib/conversations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/conversations")>();
  return { ...actual, listConversations };
});

const { useConversationList } = await import("../use-conversation-list.ts");

const SEARCH_DEBOUNCE_MS = 180;

function summary(
  id: string,
  overrides: Partial<ConversationSummary> = {}
): ConversationSummary {
  const now = new Date().toISOString();
  return {
    id,
    title: `Conversation ${id}`,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    ...overrides,
  } as ConversationSummary;
}

function page(items: ConversationSummary[], total = items.length) {
  return { conversations: items, total };
}

/** Captures the observer instance the hook creates so a test can fire the
 * intersection callback on demand — jsdom has no real observer. */
function stubIntersectionObserver() {
  const instances: {
    callback: IntersectionObserverCallback;
    disconnect: ReturnType<typeof vi.fn>;
    observe: ReturnType<typeof vi.fn>;
  }[] = [];

  class FakeObserver {
    callback: IntersectionObserverCallback;
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
    takeRecords = () => [];

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
      instances.push(this);
    }
  }

  vi.stubGlobal("IntersectionObserver", FakeObserver);
  return instances;
}

function intersect(observer: { callback: IntersectionObserverCallback }) {
  act(() => {
    observer.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
  });
}

/** Mount the hook with a sentinel node already attached. The ref has to be set
 * before the first page resolves: assigning it doesn't re-render, so the
 * observer is only created by the effect run that `hasMore` triggers. */
function mountWithSentinel() {
  const rendered = renderHook(() => useConversationList(""));
  rendered.result.current.loadMoreRef.current = document.createElement("div");
  return rendered;
}

describe("useConversationList", () => {
  beforeEach(() => {
    listConversations.mockReset();
    listConversations.mockResolvedValue(page([]));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the first page on mount and groups the results", async () => {
    listConversations.mockResolvedValue(page([summary("a"), summary("b")]));

    const { result } = renderHook(() => useConversationList(""));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(listConversations).toHaveBeenCalledWith({ limit: 30, query: "" });
    expect(result.current.groups).toEqual([
      { label: "Today", items: [expect.anything(), expect.anything()] },
    ]);
    expect(result.current.error).toBe(false);
  });

  it("debounces the search term before refetching", async () => {
    vi.useFakeTimers();
    try {
      const { result, rerender } = renderHook(
        ({ search }) => useConversationList(search),
        { initialProps: { search: "" } }
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
      });
      listConversations.mockClear();

      rerender({ search: "f" });
      rerender({ search: "fo" });
      rerender({ search: "fou" });

      // Still inside the debounce window: no request has gone out yet.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS - 1);
      });
      expect(listConversations).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });

      expect(listConversations).toHaveBeenCalledTimes(1);
      expect(listConversations).toHaveBeenCalledWith({
        limit: 30,
        query: "fou",
      });
      expect(result.current.query).toBe("fou");
    } finally {
      vi.useRealTimers();
    }
  });

  it("flags an error when the list request rejects", async () => {
    listConversations.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useConversationList(""));

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.loading).toBe(false);
    expect(result.current.groups).toEqual([]);
  });

  it("refreshes on conversations-changed without flashing the skeleton", async () => {
    listConversations.mockResolvedValue(page([summary("a")]));
    const { result } = renderHook(() => useConversationList(""));
    await waitFor(() => expect(result.current.loading).toBe(false));

    listConversations.mockResolvedValue(page([summary("a"), summary("b")]));
    act(() => {
      window.dispatchEvent(new Event("animus:conversations-changed"));
    });

    // The silent path must never flip `loading` — that would blank the whole
    // sidebar on every finished turn.
    expect(result.current.loading).toBe(false);
    await waitFor(() =>
      expect(result.current.groups[0]?.items).toHaveLength(2)
    );
    expect(result.current.loading).toBe(false);
  });

  it("stops listening for refreshes once unmounted", async () => {
    const { result, unmount } = renderHook(() => useConversationList(""));
    await waitFor(() => expect(result.current.loading).toBe(false));
    listConversations.mockClear();

    unmount();
    window.dispatchEvent(new Event("animus:conversations-changed"));

    expect(listConversations).not.toHaveBeenCalled();
  });

  it("reports hasMore while the loaded count trails the total", async () => {
    listConversations.mockResolvedValue(page([summary("a")], 5));

    const { result } = renderHook(() => useConversationList(""));

    await waitFor(() => expect(result.current.hasMore).toBe(true));
  });

  it("appends the next page when the sentinel scrolls into view", async () => {
    const observers = stubIntersectionObserver();
    listConversations.mockResolvedValue(page([summary("a")], 2));

    const { result } = mountWithSentinel();
    await waitFor(() => expect(observers.length).toBeGreaterThan(0));

    listConversations.mockResolvedValue(page([summary("b")], 2));
    const observer = observers.at(-1);
    expect(observer).toBeDefined();
    if (!observer) {
      return;
    }
    intersect(observer);

    await waitFor(() =>
      expect(result.current.groups[0]?.items).toHaveLength(2)
    );
    expect(listConversations).toHaveBeenLastCalledWith({
      limit: 30,
      offset: 1,
      query: "",
    });
    expect(result.current.hasMore).toBe(false);
  });

  it("drops duplicates the next page repeats", async () => {
    const observers = stubIntersectionObserver();
    listConversations.mockResolvedValue(page([summary("a")], 3));

    const { result } = mountWithSentinel();
    await waitFor(() => expect(observers.length).toBeGreaterThan(0));

    // A row inserted between the two requests shifts the offset window, so the
    // server can legitimately return a row we already hold.
    listConversations.mockResolvedValue(page([summary("a"), summary("b")], 2));
    const observer = observers.at(-1);
    expect(observer).toBeDefined();
    if (!observer) {
      return;
    }
    intersect(observer);

    await waitFor(() =>
      expect(result.current.groups[0]?.items).toHaveLength(2)
    );
    expect(result.current.groups[0]?.items.map((item) => item.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("flags an error when loading the next page rejects", async () => {
    const observers = stubIntersectionObserver();
    listConversations.mockResolvedValue(page([summary("a")], 2));

    const { result } = mountWithSentinel();
    await waitFor(() => expect(observers.length).toBeGreaterThan(0));

    listConversations.mockRejectedValue(new Error("nope"));
    const observer = observers.at(-1);
    expect(observer).toBeDefined();
    if (!observer) {
      return;
    }
    intersect(observer);

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.loadingMore).toBe(false);
  });
});
