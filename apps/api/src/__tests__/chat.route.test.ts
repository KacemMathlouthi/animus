import type { UIMessage } from "ai";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createManimAgent,
  ensureSandbox,
  backgroundMusicUrl,
  saveVideo,
  maybeGenerateConversationTitle,
  loadOwnedConversation,
  saveConversationMessages,
  setConversationSandboxId,
} = vi.hoisted(() => ({
  createManimAgent: vi.fn(),
  ensureSandbox: vi.fn(),
  backgroundMusicUrl: vi.fn(),
  saveVideo: vi.fn(),
  maybeGenerateConversationTitle: vi.fn(),
  loadOwnedConversation: vi.fn(),
  saveConversationMessages: vi.fn(),
  setConversationSandboxId: vi.fn(),
}));

vi.mock("@animus/agent", () => ({ createManimAgent, ensureSandbox }));
vi.mock("../lib/media.ts", () => ({ backgroundMusicUrl, saveVideo }));
vi.mock("../services/conversation-titles.ts", () => ({
  maybeGenerateConversationTitle,
}));
// Keep the pure helpers (isUIMessage, mergeIncomingMessage) faithful so the
// route's validation and merge behavior is exercised for real; mock only IO.
vi.mock("../services/conversations.ts", () => ({
  isUIMessage: (value: unknown): value is UIMessage =>
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as { id: unknown }).id === "string" &&
    "role" in value &&
    typeof (value as { role: unknown }).role === "string" &&
    "parts" in value &&
    Array.isArray((value as { parts: unknown }).parts),
  mergeIncomingMessage: (messages: UIMessage[], message: UIMessage) => {
    const index = messages.findIndex((item) => item.id === message.id);
    if (index === -1) {
      return [...messages, message];
    }
    const next = [...messages];
    next[index] = message;
    return next;
  },
  loadOwnedConversation,
  saveConversationMessages,
  setConversationSandboxId,
}));
// Bypass the real session resolution; the wrapper app injects the user instead.
vi.mock("../middleware/auth.ts", () => ({
  requireAuth: (_c: unknown, next: () => Promise<void>) => next(),
}));

const { chatRoute } = await import("../routes/chat.ts");

type TestUser = { id: string } | null;

function appWith(user: TestUser) {
  const app = new Hono<{ Variables: { user: TestUser } }>();
  app.use("*", async (c, next) => {
    c.set("user", user);
    await next();
  });
  app.route("/chat", chatRoute);
  return app;
}

function userMessage(id: string, text: string): UIMessage {
  return { id, role: "user", parts: [{ type: "text", text }] };
}

function post(user: TestUser, body: unknown) {
  return appWith(user).request("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  createManimAgent.mockReset();
  ensureSandbox.mockReset();
  backgroundMusicUrl.mockReset();
  saveVideo.mockReset();
  maybeGenerateConversationTitle.mockReset();
  loadOwnedConversation.mockReset();
  saveConversationMessages.mockReset();
  setConversationSandboxId.mockReset();
});

describe("POST /chat — request validation", () => {
  it("400s when id is missing", async () => {
    const res = await post({ id: "u1" }, { message: userMessage("m1", "hi") });

    expect(res.status).toBe(400);
    expect(loadOwnedConversation).not.toHaveBeenCalled();
  });

  it("400s when message is missing", async () => {
    const res = await post({ id: "u1" }, { id: "conv1" });

    expect(res.status).toBe(400);
    expect(loadOwnedConversation).not.toHaveBeenCalled();
  });

  it("400s when message is not a UI message", async () => {
    const res = await post(
      { id: "u1" },
      { id: "conv1", message: { not: "a message" } }
    );

    expect(res.status).toBe(400);
    expect(loadOwnedConversation).not.toHaveBeenCalled();
  });
});

describe("POST /chat — ownership", () => {
  it("404s when the conversation is not found or owned", async () => {
    loadOwnedConversation.mockResolvedValue(null);

    const res = await post(
      { id: "u1" },
      { id: "conv1", message: userMessage("m1", "hi") }
    );

    expect(res.status).toBe(404);
    expect(loadOwnedConversation).toHaveBeenCalledWith({
      conversationId: "conv1",
      userId: "u1",
    });
    expect(ensureSandbox).not.toHaveBeenCalled();
  });
});

describe("POST /chat — happy path", () => {
  it("ensures the sandbox, persists a new id, streams, and saves on finish", async () => {
    loadOwnedConversation.mockResolvedValue({
      conversation: { id: "conv1", sandboxId: "old-sandbox" },
      messages: [],
    });
    // A brand-new sandbox id (differs from the stored one) must be persisted.
    ensureSandbox.mockResolvedValue({ id: "new-sandbox" });

    const completedMessages: UIMessage[] = [
      userMessage("m1", "hi"),
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "hello" }] },
    ];

    const toUIMessageStreamResponse = vi.fn(
      async (opts: {
        onFinish: (arg: { messages: UIMessage[] }) => Promise<void> | void;
      }) => {
        // Simulate the stream completing and triggering persistence.
        await opts.onFinish({ messages: completedMessages });
        return new Response("ok");
      }
    );
    const stream = vi.fn().mockResolvedValue({ toUIMessageStreamResponse });
    createManimAgent.mockReturnValue({ stream });
    saveConversationMessages.mockResolvedValue(undefined);

    const res = await post(
      { id: "u1" },
      { id: "conv1", message: userMessage("m1", "hi") }
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");

    expect(ensureSandbox).toHaveBeenCalledWith({
      conversationId: "conv1",
      sandboxId: "old-sandbox",
    });
    expect(setConversationSandboxId).toHaveBeenCalledWith(
      "conv1",
      "new-sandbox"
    );

    expect(createManimAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        sandbox: { id: "new-sandbox" },
        conversationId: "conv1",
        saveVideo,
        backgroundMusicUrl,
      })
    );
    expect(stream).toHaveBeenCalledTimes(1);

    expect(saveConversationMessages).toHaveBeenCalledWith({
      conversationId: "conv1",
      messages: completedMessages,
    });
    expect(maybeGenerateConversationTitle).toHaveBeenCalledWith({
      conversationId: "conv1",
      messages: completedMessages,
    });
  });

  it("does not re-persist the sandbox id when it is unchanged", async () => {
    loadOwnedConversation.mockResolvedValue({
      conversation: { id: "conv1", sandboxId: "same-sandbox" },
      messages: [],
    });
    ensureSandbox.mockResolvedValue({ id: "same-sandbox" });

    const toUIMessageStreamResponse = vi.fn(() => new Response("ok"));
    createManimAgent.mockReturnValue({
      stream: vi.fn().mockResolvedValue({ toUIMessageStreamResponse }),
    });

    const res = await post(
      { id: "u1" },
      { id: "conv1", message: userMessage("m1", "hi") }
    );

    expect(res.status).toBe(200);
    expect(setConversationSandboxId).not.toHaveBeenCalled();
  });
});
