import { FREE_GRANT_MICROS, OUT_OF_CREDITS } from "@animus/core";
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
  getDecryptedLlmKey,
  getDecryptedTtsKey,
  getOrCreateCredits,
  settleUsage,
} = vi.hoisted(() => ({
  createManimAgent: vi.fn(),
  ensureSandbox: vi.fn(),
  backgroundMusicUrl: vi.fn(),
  saveVideo: vi.fn(),
  maybeGenerateConversationTitle: vi.fn(),
  loadOwnedConversation: vi.fn(),
  saveConversationMessages: vi.fn(),
  setConversationSandboxId: vi.fn(),
  getDecryptedLlmKey: vi.fn(),
  getDecryptedTtsKey: vi.fn(),
  getOrCreateCredits: vi.fn(),
  settleUsage: vi.fn(),
}));

vi.mock("@animus/agent", () => ({ createManimAgent, ensureSandbox }));
vi.mock("@animus/core/env", () => ({
  getServerEnv: () => ({
    bedrockModel: "model-x",
    elevenLabsApiKey: "our-eleven-key",
  }),
}));
vi.mock("../observability/telemetry.ts", () => ({
  aiTelemetry: (opts: unknown) => opts,
}));
vi.mock("../lib/media.ts", () => ({ backgroundMusicUrl, saveVideo }));
vi.mock("../services/conversation-titles.ts", () => ({
  maybeGenerateConversationTitle,
}));
vi.mock("../services/credits.ts", () => ({ getOrCreateCredits, settleUsage }));
vi.mock("../services/settings.ts", () => ({
  getDecryptedLlmKey,
  getDecryptedTtsKey,
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

const COMPLETED: UIMessage[] = [
  userMessage("m1", "hi"),
  { id: "a1", role: "assistant", parts: [{ type: "text", text: "hello" }] },
];

/** A fake agent whose stream, on finish, invokes onFinish with completed
 * messages and exposes token usage — mirroring the AI SDK stream result. */
function stubAgentStream(usage = { inputTokens: 100, outputTokens: 50 }) {
  const toUIMessageStreamResponse = vi.fn(
    async (opts: {
      onFinish: (arg: { messages: UIMessage[] }) => Promise<void> | void;
    }) => {
      await opts.onFinish({ messages: COMPLETED });
      return new Response("ok");
    }
  );
  const stream = vi.fn().mockResolvedValue({
    toUIMessageStreamResponse,
    totalUsage: Promise.resolve(usage),
  });
  createManimAgent.mockReturnValue({ stream });
  return { stream };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Defaults: a metered user (no BYOK keys) with a healthy balance.
  getDecryptedLlmKey.mockResolvedValue(undefined);
  getDecryptedTtsKey.mockResolvedValue(undefined);
  getOrCreateCredits.mockResolvedValue({
    balanceMicros: FREE_GRANT_MICROS,
    grantMicros: FREE_GRANT_MICROS,
  });
  settleUsage.mockResolvedValue(0);
  saveConversationMessages.mockResolvedValue(undefined);
  loadOwnedConversation.mockResolvedValue({
    conversation: { id: "conv1", sandboxId: "old-sandbox" },
    messages: [],
  });
  ensureSandbox.mockResolvedValue({ id: "new-sandbox" });
});

describe("POST /chat — request validation", () => {
  it("400s when id is missing", async () => {
    const res = await post({ id: "u1" }, { message: userMessage("m1", "hi") });
    expect(res.status).toBe(400);
    expect(loadOwnedConversation).not.toHaveBeenCalled();
  });

  it("400s when message is not a UI message", async () => {
    const res = await post(
      { id: "u1" },
      { id: "conv1", message: { not: "a message" } }
    );
    expect(res.status).toBe(400);
  });

  it("400s (not 500) when the body is not JSON at all", async () => {
    const res = await appWith({ id: "u1" }).request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{",
    });
    expect(res.status).toBe(400);
    expect(loadOwnedConversation).not.toHaveBeenCalled();
  });

  it("400s when id is not a string, instead of leaking it into queries", async () => {
    const res = await post(
      { id: "u1" },
      { id: 123, message: userMessage("m1", "hi") }
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
    expect(ensureSandbox).not.toHaveBeenCalled();
  });
});

describe("POST /chat — credit gate", () => {
  it("402s a metered user with no balance, before touching the sandbox", async () => {
    getOrCreateCredits.mockResolvedValue({
      balanceMicros: 0,
      grantMicros: FREE_GRANT_MICROS,
    });

    const res = await post(
      { id: "u1" },
      { id: "conv1", message: userMessage("m1", "hi") }
    );

    expect(res.status).toBe(402);
    expect(await res.json()).toMatchObject({ code: OUT_OF_CREDITS });
    expect(ensureSandbox).not.toHaveBeenCalled();
    expect(createManimAgent).not.toHaveBeenCalled();
  });

  it("persists the refused message so it survives the 402", async () => {
    getOrCreateCredits.mockResolvedValue({
      balanceMicros: 0,
      grantMicros: FREE_GRANT_MICROS,
    });

    const res = await post(
      { id: "u1" },
      { id: "conv1", message: userMessage("m1", "make the graph blue") }
    );

    expect(res.status).toBe(402);
    expect(saveConversationMessages).toHaveBeenCalledWith({
      conversationId: "conv1",
      messages: [userMessage("m1", "make the graph blue")],
    });
  });

  it("names the missing narration key for an LLM-BYOK user", async () => {
    getDecryptedLlmKey.mockResolvedValue({
      provider: "anthropic",
      model: "claude-opus-4-6",
      apiKey: "sk-ant-user",
    });
    getOrCreateCredits.mockResolvedValue({
      balanceMicros: 0,
      grantMicros: FREE_GRANT_MICROS,
    });

    const res = await post(
      { id: "u1" },
      { id: "conv1", message: userMessage("m1", "hi") }
    );

    expect(res.status).toBe(402);
    const body = (await res.json()) as { message: string };
    expect(body.message).toContain("ElevenLabs narration key");
    expect(body.message).not.toContain("model key");
  });

  it("names both keys for a fully metered user at zero balance", async () => {
    getOrCreateCredits.mockResolvedValue({
      balanceMicros: 0,
      grantMicros: FREE_GRANT_MICROS,
    });

    const res = await post(
      { id: "u1" },
      { id: "conv1", message: userMessage("m1", "hi") }
    );

    const body = (await res.json()) as { message: string };
    expect(body.message).toContain("model and ElevenLabs keys");
  });

  it("does not gate a fully-BYOK user (both keys), skipping the balance check", async () => {
    getDecryptedLlmKey.mockResolvedValue({
      provider: "anthropic",
      model: "claude-opus-4-6",
      apiKey: "sk-ant-user",
    });
    getDecryptedTtsKey.mockResolvedValue("user-eleven-key");
    stubAgentStream();

    const res = await post(
      { id: "u1" },
      { id: "conv1", message: userMessage("m1", "hi") }
    );

    expect(res.status).toBe(200);
    expect(getOrCreateCredits).not.toHaveBeenCalled();
    // Their own ElevenLabs key flows into the sandbox and the agent.
    expect(ensureSandbox).toHaveBeenCalledWith({
      conversationId: "conv1",
      sandboxId: "old-sandbox",
      elevenLabsApiKey: "user-eleven-key",
    });
    expect(createManimAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        elevenLabsApiKey: "user-eleven-key",
        llmKey: {
          provider: "anthropic",
          model: "claude-opus-4-6",
          apiKey: "sk-ant-user",
        },
      })
    );
    // Nothing billable for a fully-BYOK turn.
    expect(settleUsage).toHaveBeenCalledWith(
      expect.objectContaining({ isLlmMetered: false, isTtsMetered: false })
    );
  });
});

describe("POST /chat — happy path (metered)", () => {
  it("ensures the sandbox with our key, streams, saves, and settles on finish", async () => {
    stubAgentStream({ inputTokens: 100, outputTokens: 50 });

    const res = await post(
      { id: "u1" },
      { id: "conv1", message: userMessage("m1", "hi") }
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");

    expect(ensureSandbox).toHaveBeenCalledWith({
      conversationId: "conv1",
      sandboxId: "old-sandbox",
      elevenLabsApiKey: "our-eleven-key",
    });
    expect(setConversationSandboxId).toHaveBeenCalledWith(
      "conv1",
      "new-sandbox"
    );
    expect(createManimAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        sandbox: { id: "new-sandbox" },
        conversationId: "conv1",
        elevenLabsApiKey: "our-eleven-key",
        llmKey: undefined,
        meter: expect.objectContaining({ ttsChars: expect.any(Number) }),
      })
    );

    expect(saveConversationMessages).toHaveBeenCalledWith({
      conversationId: "conv1",
      messages: COMPLETED,
    });
    // Metered turn settles against a per-request turn id.
    expect(settleUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        conversationId: "conv1",
        turnId: expect.any(String),
        isLlmMetered: true,
        isTtsMetered: true,
        model: "model-x",
        inputTokens: 100,
        outputTokens: 50,
      })
    );
  });

  it("settles each request with a distinct turn id (HITL continuations aren't deduped)", async () => {
    // A single assistant message can span multiple requests during a
    // human-in-the-loop exchange; each request must settle independently, so the
    // idempotency key must differ per request even when the message id repeats.
    stubAgentStream();
    await post({ id: "u1" }, { id: "conv1", message: userMessage("m1", "hi") });
    await post({ id: "u1" }, { id: "conv1", message: userMessage("m2", "go") });

    const turnIds = settleUsage.mock.calls.map(([arg]) => arg.turnId);
    expect(turnIds).toHaveLength(2);
    expect(turnIds[0]).not.toBe(turnIds[1]);
  });

  it("does not re-persist the sandbox id when it is unchanged", async () => {
    ensureSandbox.mockResolvedValue({ id: "old-sandbox" });
    stubAgentStream();

    const res = await post(
      { id: "u1" },
      { id: "conv1", message: userMessage("m1", "hi") }
    );

    expect(res.status).toBe(200);
    expect(setConversationSandboxId).not.toHaveBeenCalled();
  });
});
