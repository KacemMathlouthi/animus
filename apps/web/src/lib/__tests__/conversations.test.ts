import type { ConversationSummary } from "@animus/core";
import { describe, expect, it, vi } from "vitest";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch }));

const {
  deleteConversation,
  groupConversations,
  listConversations,
  notifyConversationsChanged,
  renameConversation,
} = await import("@/lib/conversations");

const NOW = new Date("2026-07-26T12:00:00.000Z");

function at(iso: string): ConversationSummary {
  return {
    id: iso,
    title: iso,
    createdAt: iso,
    updatedAt: iso,
    lastMessageAt: iso,
  } as ConversationSummary;
}

describe("groupConversations", () => {
  it("returns nothing for an empty list", () => {
    expect(groupConversations([], NOW)).toEqual([]);
  });

  it("labels buckets by recency", () => {
    const groups = groupConversations(
      [
        at("2026-07-26T09:00:00.000Z"),
        at("2026-07-25T09:00:00.000Z"),
        at("2026-07-22T09:00:00.000Z"),
        at("2026-03-04T09:00:00.000Z"),
      ],
      NOW
    );

    expect(groups.map((group) => group.label)).toEqual([
      "Today",
      "Yesterday",
      "Previous 7 days",
      "March 2026",
    ]);
  });

  it("keeps same-bucket conversations together in order", () => {
    const groups = groupConversations(
      [at("2026-07-26T09:00:00.000Z"), at("2026-07-26T11:00:00.000Z")],
      NOW
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.items).toHaveLength(2);
  });

  it("falls back to updatedAt when a conversation has no messages", () => {
    const groups = groupConversations(
      [
        {
          id: "empty",
          title: "New video",
          createdAt: "2026-07-26T09:00:00.000Z",
          updatedAt: "2026-07-26T09:00:00.000Z",
          lastMessageAt: null,
        } as ConversationSummary,
      ],
      NOW
    );

    expect(groups[0]?.label).toBe("Today");
  });

  it("treats the 7-day edge as a dated month, not 'Previous 7 days'", () => {
    const groups = groupConversations([at("2026-07-19T09:00:00.000Z")], NOW);

    expect(groups[0]?.label).toBe("July 2026");
  });
});

describe("listConversations", () => {
  it("requests the bare path when no options are given", async () => {
    apiFetch.mockResolvedValue({ conversations: [], total: 0 });

    await listConversations();

    expect(apiFetch).toHaveBeenCalledWith("/api/conversations");
  });

  it("encodes limit, offset and a trimmed query", async () => {
    apiFetch.mockResolvedValue({ conversations: [], total: 0 });

    await listConversations({ limit: 30, offset: 60, query: "  fourier  " });

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/conversations?q=fourier&limit=30&offset=60"
    );
  });

  it("omits a whitespace-only query and a zero offset", async () => {
    apiFetch.mockResolvedValue({ conversations: [], total: 0 });

    await listConversations({ limit: 30, offset: 0, query: "   " });

    expect(apiFetch).toHaveBeenCalledWith("/api/conversations?limit=30");
  });
});

describe("mutations", () => {
  it("renames through PATCH with a JSON body", async () => {
    apiFetch.mockResolvedValue({ conversation: { id: "c1", title: "New" } });

    await renameConversation("c1", { title: "New" });

    expect(apiFetch).toHaveBeenCalledWith("/api/conversations/c1", {
      method: "PATCH",
      body: JSON.stringify({ title: "New" }),
    });
  });

  it("deletes through DELETE", async () => {
    apiFetch.mockResolvedValue({ ok: true });

    await deleteConversation("c1");

    expect(apiFetch).toHaveBeenCalledWith("/api/conversations/c1", {
      method: "DELETE",
    });
  });
});

describe("notifyConversationsChanged", () => {
  it("fires the event the sidebar listens for", () => {
    const listener = vi.fn();
    window.addEventListener("animus:conversations-changed", listener);

    notifyConversationsChanged();

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("animus:conversations-changed", listener);
  });
});
