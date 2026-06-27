import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createConversation,
  deleteConversation,
  listConversations,
  loadOwnedConversation,
  renameConversation,
  serializeConversation,
  deleteConversationMedia,
  destroySandbox,
} = vi.hoisted(() => ({
  createConversation: vi.fn(),
  deleteConversation: vi.fn(),
  listConversations: vi.fn(),
  loadOwnedConversation: vi.fn(),
  renameConversation: vi.fn(),
  serializeConversation: vi.fn(),
  deleteConversationMedia: vi.fn(),
  destroySandbox: vi.fn(),
}));

vi.mock("../services/conversations.ts", () => ({
  createConversation,
  deleteConversation,
  listConversations,
  loadOwnedConversation,
  renameConversation,
  serializeConversation,
}));
vi.mock("../lib/media.ts", () => ({ deleteConversationMedia }));
vi.mock("@animus/agent", () => ({ destroySandbox }));
// The route logs cleanup failures; stub the logger so importing it doesn't pull
// in the server-env init.
vi.mock("../lib/logger.ts", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
// Bypass the real session resolution; the wrapper app injects the user instead.
vi.mock("../middleware/auth.ts", () => ({
  requireAuth: (_c: unknown, next: () => Promise<void>) => next(),
}));

const { conversationsRoute } = await import("../routes/conversations.ts");

type TestUser = { id: string } | null;

const SUMMARY = {
  id: "conv1",
  title: "Untitled video",
  titleStatus: "pending" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  lastMessageAt: null,
};

function appWith(user: TestUser) {
  const app = new Hono<{ Variables: { user: TestUser } }>();
  app.use("*", async (c, next) => {
    c.set("user", user);
    await next();
  });
  app.route("/conversations", conversationsRoute);
  return app;
}

beforeEach(() => {
  createConversation.mockReset();
  deleteConversation.mockReset();
  listConversations.mockReset();
  loadOwnedConversation.mockReset();
  renameConversation.mockReset();
  serializeConversation.mockReset();
  deleteConversationMedia.mockReset();
  destroySandbox.mockReset();
  deleteConversationMedia.mockResolvedValue(undefined);
  destroySandbox.mockResolvedValue(undefined);
});

describe("POST /conversations", () => {
  it("creates a conversation for the caller", async () => {
    createConversation.mockResolvedValue(SUMMARY);

    const res = await appWith({ id: "u1" }).request("/conversations", {
      method: "POST",
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ conversation: SUMMARY });
    expect(createConversation).toHaveBeenCalledWith("u1");
  });
});

describe("GET /conversations", () => {
  it("lists conversations and passes through limit/offset/q", async () => {
    listConversations.mockResolvedValue({
      conversations: [SUMMARY],
      total: 1,
    });

    const res = await appWith({ id: "u1" }).request(
      "/conversations?limit=10&offset=5&q=physics"
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ conversations: [SUMMARY], total: 1 });
    expect(listConversations).toHaveBeenCalledWith({
      userId: "u1",
      query: "physics",
      limit: 10,
      offset: 5,
    });
  });

  it("omits limit/offset when not numeric", async () => {
    listConversations.mockResolvedValue({ conversations: [], total: 0 });

    const res = await appWith({ id: "u1" }).request("/conversations");

    expect(res.status).toBe(200);
    expect(listConversations).toHaveBeenCalledWith({
      userId: "u1",
      query: undefined,
      limit: undefined,
      offset: undefined,
    });
  });
});

describe("GET /conversations/:id", () => {
  it("returns the conversation with its messages", async () => {
    const messages = [{ id: "m1", role: "user", parts: [] }];
    loadOwnedConversation.mockResolvedValue({
      conversation: { raw: true },
      messages,
    });
    serializeConversation.mockReturnValue(SUMMARY);

    const res = await appWith({ id: "u1" }).request("/conversations/conv1");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ conversation: SUMMARY, messages });
    expect(loadOwnedConversation).toHaveBeenCalledWith({
      conversationId: "conv1",
      userId: "u1",
    });
  });

  it("404s when the conversation is not found or owned", async () => {
    loadOwnedConversation.mockResolvedValue(null);

    const res = await appWith({ id: "u1" }).request("/conversations/missing");

    expect(res.status).toBe(404);
  });
});

describe("PATCH /conversations/:id", () => {
  function patch(user: TestUser, body: unknown) {
    return appWith(user).request("/conversations/conv1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("400s on an invalid title", async () => {
    const res = await patch({ id: "u1" }, { title: "   " });

    expect(res.status).toBe(400);
    expect(renameConversation).not.toHaveBeenCalled();
  });

  it("404s when the conversation is not found or owned", async () => {
    renameConversation.mockResolvedValue(null);

    const res = await patch({ id: "u1" }, { title: "New title" });

    expect(res.status).toBe(404);
    expect(renameConversation).toHaveBeenCalledWith({
      conversationId: "conv1",
      userId: "u1",
      title: "New title",
    });
  });

  it("renames the conversation", async () => {
    const renamed = { ...SUMMARY, title: "New title", titleStatus: "manual" };
    renameConversation.mockResolvedValue(renamed);

    const res = await patch({ id: "u1" }, { title: "New title" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ conversation: renamed });
  });
});

describe("DELETE /conversations/:id", () => {
  function del(user: TestUser, id = "conv1") {
    return appWith(user).request(`/conversations/${id}`, { method: "DELETE" });
  }

  it("404s when the conversation is not found or owned", async () => {
    deleteConversation.mockResolvedValue(null);

    const res = await del({ id: "u1" });

    expect(res.status).toBe(404);
    expect(destroySandbox).not.toHaveBeenCalled();
    expect(deleteConversationMedia).not.toHaveBeenCalled();
  });

  it("deletes and triggers out-of-band sandbox + media cleanup", async () => {
    deleteConversation.mockResolvedValue({ sandboxId: "sandbox-1" });

    const res = await del({ id: "u1" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(deleteConversation).toHaveBeenCalledWith({
      conversationId: "conv1",
      userId: "u1",
    });
    expect(destroySandbox).toHaveBeenCalledWith("sandbox-1");
    expect(deleteConversationMedia).toHaveBeenCalledWith("conv1");
  });

  it("skips sandbox teardown when there is no sandbox, still cleans media", async () => {
    deleteConversation.mockResolvedValue({ sandboxId: null });

    const res = await del({ id: "u1" });

    expect(res.status).toBe(200);
    expect(destroySandbox).not.toHaveBeenCalled();
    expect(deleteConversationMedia).toHaveBeenCalledWith("conv1");
  });
});
