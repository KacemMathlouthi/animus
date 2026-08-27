import { FREE_GRANT_MICROS, OUT_OF_CREDITS } from "@animus/core";
import {
  simulateReadableStream,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
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
  getGenerationSettings,
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
  getGenerationSettings: vi.fn(),
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
  getGenerationSettings,
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

/** Leaves the turn (and its concurrency slot) in flight. Only the cap tests
 * want this. */
function postRaw(user: TestUser, body: unknown) {
  return appWith(user).request("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Drains the stream so callbacks have run and the slot is released before
 * asserting. `inFlightTurns` is module state that survives clearAllMocks, so a
 * test leaving a turn open makes the next one 429. */
async function post(user: TestUser, body: unknown): Promise<Response> {
  const response = await postRaw(user, body);
  await response.clone().text();
  return response;
}

/** Chunks fed to the route's stream. The real createUIMessageStream turns these
 * into UI messages and fires its callbacks, so the tests exercise the actual
 * persistence wiring rather than a stand-in. */
function textStepChunks(text: string): UIMessageChunk[] {
  return [
    { type: "start" },
    { type: "start-step" },
    { type: "text-start", id: "t1" },
    { type: "text-delta", delta: text, id: "t1" },
    { type: "text-end", id: "t1" },
    { type: "finish-step" },
    { type: "finish" },
  ];
}

function chunkStream(chunks: UIMessageChunk[]): ReadableStream<UIMessageChunk> {
  return simulateReadableStream({ chunks, initialDelayInMs: 0 });
}

/** Fires the onStepFinish the route registered on the agent — usage is
 * accumulated per completed step, exactly as the SDK reports it. */
function emitStep(usage: { inputTokens: number; outputTokens: number }) {
  const deps = createManimAgent.mock.calls.at(-1)?.[0] as {
    onStepFinish?: (step: { usage: typeof usage }) => void;
  };
  deps.onStepFinish?.({ usage });
}

/** A fake agent whose stream completes one step and finishes — mirroring the
 * AI SDK stream result surface the route consumes. */
function stubAgentStream(
  usage = { inputTokens: 100, outputTokens: 50 },
  { isAborted = false } = {}
) {
  const chunks = textStepChunks("hello");
  if (isAborted) {
    // An aborted turn stops after its step rather than reaching `finish`.
    chunks.splice(-1, 1, { type: "abort" });
  }
  const toUIMessageStream = vi.fn(() => {
    emitStep(usage);
    return chunkStream(chunks);
  });
  const stream = vi.fn().mockResolvedValue({ toUIMessageStream });
  createManimAgent.mockReturnValue({ stream });
  return { stream, toUIMessageStream };
}

/** The most recent snapshot the route persisted. */
function lastSnapshot(): { conversationId: string; messages: UIMessage[] } {
  const call = saveConversationMessages.mock.calls.at(-1);
  if (!call) {
    throw new Error("expected saveConversationMessages to have been called");
  }
  return call[0] as { conversationId: string; messages: UIMessage[] };
}

/** Text of the assistant message in a persisted snapshot. */
function assistantText(messages: UIMessage[]): string {
  const assistant = messages.filter((m) => m.role === "assistant").at(-1);
  return (assistant?.parts ?? [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

beforeEach(() => {
  vi.clearAllMocks();
  // Defaults: a metered user (no BYOK keys) with a healthy balance.
  getDecryptedLlmKey.mockResolvedValue(undefined);
  getDecryptedTtsKey.mockResolvedValue(undefined);
  getGenerationSettings.mockResolvedValue({
    videoTheme: "dark",
    backgroundMusic: false,
    musicTrack: "upbeat",
    voiceId: "voice-user-choice",
    font: "geist",
  });
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
    expect(res.headers.get("content-type")).toContain("text/event-stream");

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
        // The user's generation settings shape the turn.
        voiceId: "voice-user-choice",
        backgroundMusic: false,
        musicTrackId: "upbeat",
      })
    );

    const snapshot = lastSnapshot();
    expect(snapshot.conversationId).toBe("conv1");
    expect(snapshot.messages.at(0)).toMatchObject({ id: "m1", role: "user" });
    expect(assistantText(snapshot.messages)).toBe("hello");
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

  it("sums usage across multiple completed steps", async () => {
    const toUIMessageStream = vi.fn(() => {
      emitStep({ inputTokens: 1000, outputTokens: 20 });
      emitStep({ inputTokens: 2500, outputTokens: 80 });
      return chunkStream([
        { type: "start" },
        { type: "start-step" },
        { type: "text-start", id: "t1" },
        { type: "text-delta", delta: "one", id: "t1" },
        { type: "text-end", id: "t1" },
        { type: "finish-step" },
        { type: "start-step" },
        { type: "text-start", id: "t2" },
        { type: "text-delta", delta: " two", id: "t2" },
        { type: "text-end", id: "t2" },
        { type: "finish-step" },
        { type: "finish" },
      ]);
    });
    createManimAgent.mockReturnValue({
      stream: vi.fn().mockResolvedValue({ toUIMessageStream }),
    });

    await post({ id: "u1" }, { id: "conv1", message: userMessage("m1", "hi") });

    expect(settleUsage).toHaveBeenCalledWith(
      expect.objectContaining({ inputTokens: 3500, outputTokens: 100 })
    );
  });

  it("persists a snapshot after every step, not just at the end", async () => {
    const toUIMessageStream = vi.fn(() =>
      chunkStream([
        { type: "start" },
        { type: "start-step" },
        { type: "text-start", id: "t1" },
        { type: "text-delta", delta: "step one", id: "t1" },
        { type: "text-end", id: "t1" },
        { type: "finish-step" },
        { type: "start-step" },
        { type: "text-start", id: "t2" },
        { type: "text-delta", delta: " step two", id: "t2" },
        { type: "text-end", id: "t2" },
        { type: "finish-step" },
        { type: "finish" },
      ])
    );
    createManimAgent.mockReturnValue({
      stream: vi.fn().mockResolvedValue({ toUIMessageStream }),
    });

    await post({ id: "u1" }, { id: "conv1", message: userMessage("m1", "hi") });

    // Two steps plus the final write.
    expect(saveConversationMessages.mock.calls.length).toBeGreaterThanOrEqual(
      2
    );
    const texts = saveConversationMessages.mock.calls.map(([arg]) =>
      assistantText((arg as { messages: UIMessage[] }).messages)
    );
    expect(texts).toContain("step one");
    expect(texts.at(-1)).toBe("step one step two");
  });
});

describe("POST /chat — resuming an interrupted turn", () => {
  it("does not send an unfinished tool call to the model", async () => {
    // Per-step persistence means a turn cut off mid-render is stored with its
    // renderScene still `input-available`. Handing that to the provider is a
    // tool_use with no tool_result, which is a hard error — it would reject
    // every later message in the conversation, not just this one.
    loadOwnedConversation.mockResolvedValue({
      conversation: { id: "conv1", sandboxId: "sandbox-1" },
      messages: [
        userMessage("m1", "make a video"),
        {
          id: "a1",
          role: "assistant",
          parts: [
            { type: "text", text: "Rendering now.", state: "done" },
            {
              type: "tool-renderScene",
              toolCallId: "call-stuck",
              state: "input-available",
              input: {
                file: "scene.py",
                scene: "NineRepeating",
                quality: "high",
              },
            },
          ],
        } as unknown as UIMessage,
      ],
    });
    const { stream } = stubAgentStream();

    const res = await post(
      { id: "u1" },
      { id: "conv1", message: userMessage("m2", "continue") }
    );

    expect(res.status).toBe(200);
    const prompt = stream.mock.calls.at(-1)?.[0]?.prompt as Array<{
      content: unknown;
    }>;
    const serialized = JSON.stringify(prompt);
    expect(serialized).not.toContain("call-stuck");
    expect(serialized).toContain("continue");
  });
});

describe("POST /chat — turn lifecycle (abort/error)", () => {
  it("persists messages and settles an ABORTED turn, without titling it", async () => {
    stubAgentStream(
      { inputTokens: 700, outputTokens: 30 },
      { isAborted: true }
    );

    const res = await post(
      { id: "u1" },
      { id: "conv1", message: userMessage("m1", "hi") }
    );

    expect(res.status).toBe(200);
    // The stopped turn keeps the user's message and partial assistant work.
    expect(lastSnapshot().conversationId).toBe("conv1");
    expect(assistantText(lastSnapshot().messages)).toBe("hello");
    expect(maybeGenerateConversationTitle).not.toHaveBeenCalled();
    // Steps completed before the abort are real spend — they settle.
    expect(settleUsage).toHaveBeenCalledWith(
      expect.objectContaining({ inputTokens: 700, outputTokens: 30 })
    );
  });

  it("keeps the step's work and settles when the turn dies mid-stream", async () => {
    // The completed step must survive, or the conversation reverts.
    const toUIMessageStream = vi.fn(() => {
      emitStep({ inputTokens: 400, outputTokens: 10 });
      return new ReadableStream<UIMessageChunk>({
        // The error must land a tick later than the last chunk: erroring in the
        // same tick discards the queue, which no real provider stream does.
        async start(controller) {
          for (const chunk of [
            { type: "start" } as const,
            { type: "start-step" } as const,
            { type: "text-start", id: "t1" } as const,
            { type: "text-delta", delta: "half a scene", id: "t1" } as const,
            { type: "text-end", id: "t1" } as const,
            { type: "finish-step" } as const,
          ]) {
            controller.enqueue(chunk);
          }
          // A macrotask: the chunks must be delivered before the error lands.
          await new Promise((resolve) => setTimeout(resolve, 0));
          controller.error(new Error("Bedrock exploded: sk-secret"));
        },
      });
    });
    createManimAgent.mockReturnValue({
      stream: vi.fn().mockResolvedValue({ toUIMessageStream }),
    });

    const res = await post(
      { id: "u1" },
      { id: "conv1", message: userMessage("m1", "hi") }
    );
    const body = await res.clone().text();

    // The completed step was persisted even though the turn never finished.
    // The write is queued behind the step callback, so wait for it to land.
    await vi.waitFor(() =>
      expect(assistantText(lastSnapshot().messages)).toBe("half a scene")
    );
    // Settled exactly once despite the error and backstop paths both running.
    expect(settleUsage).toHaveBeenCalledTimes(1);
    expect(settleUsage).toHaveBeenCalledWith(
      expect.objectContaining({ inputTokens: 400, outputTokens: 10 })
    );
    // The raw provider error never reaches the client.
    expect(body).not.toContain("Bedrock");
    expect(body).not.toContain("sk-secret");
  });
});

describe("POST /chat — per-user concurrency cap", () => {
  it("429s a third simultaneous turn and frees the slot when a turn ends", async () => {
    // Streams that never close: onFinish never runs, so the slot stays held.
    const held: ReadableStreamDefaultController<UIMessageChunk>[] = [];
    const toUIMessageStream = vi.fn(
      () =>
        new ReadableStream<UIMessageChunk>({
          start(controller) {
            controller.enqueue({ type: "start" });
            held.push(controller);
          },
        })
    );
    createManimAgent.mockReturnValue({
      stream: vi.fn().mockResolvedValue({ toUIMessageStream }),
    });

    const user = { id: "u-cap" };
    const msg = (id: string) => ({
      id: "conv1",
      message: userMessage(id, "hi"),
    });

    expect((await postRaw(user, msg("m1"))).status).toBe(200);
    expect((await postRaw(user, msg("m2"))).status).toBe(200);
    const third = await postRaw(user, msg("m3"));
    expect(third.status).toBe(429);

    // Finish one held turn — its slot frees and the next request is admitted.
    const first = held[0];
    if (!first) {
      throw new Error("expected a held stream");
    }
    first.enqueue({ type: "finish" });
    first.close();
    // Poll until the freed slot admits a new turn.
    await vi.waitFor(async () => {
      expect((await postRaw(user, msg("m4"))).status).toBe(200);
    });

    // Release the remaining held turn so its slot does not leak into later tests.
    for (const controller of held.slice(1)) {
      controller.enqueue({ type: "finish" });
      controller.close();
    }
  });

  it("does not leak the slot when the sandbox fails to start", async () => {
    const user = { id: "u-sandbox-fail" };
    ensureSandbox.mockRejectedValueOnce(new Error("daytona down"));

    const failed = await post(user, {
      id: "conv1",
      message: userMessage("m1", "hi"),
    });
    expect(failed.status).toBe(500);

    // The slot released on the throw — the retry is admitted, twice over.
    ensureSandbox.mockResolvedValue({ id: "new-sandbox" });
    stubAgentStream();
    expect(
      (await post(user, { id: "conv1", message: userMessage("m2", "hi") }))
        .status
    ).toBe(200);
  });
});
