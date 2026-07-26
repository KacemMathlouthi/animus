import type { RenderSceneOutput } from "@animus/core/tools";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ChatStatus } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnimusUIMessage } from "@/features/studio/types";

/** The AI SDK's useChat is the seam: everything under test here is the
 * derivation on top of it (phase, videoKey, the auto-send guard), so the SDK
 * itself is replaced with a controllable stub rather than a fake server. */
const chat = vi.hoisted(() => ({
  options: undefined as
    | { onFinish?: (event: unknown) => void; id?: string }
    | undefined,
  addToolOutput: vi.fn(),
  messages: [] as unknown[],
  regenerate: vi.fn(),
  sendMessage: vi.fn(),
  status: "ready" as ChatStatus,
  stop: vi.fn(),
  error: undefined as Error | undefined,
}));

vi.mock("@ai-sdk/react", () => ({
  useChat: (options: { onFinish?: (event: unknown) => void; id?: string }) => {
    chat.options = options;
    return {
      messages: chat.messages,
      sendMessage: chat.sendMessage,
      status: chat.status,
      addToolOutput: chat.addToolOutput,
      stop: chat.stop,
      error: chat.error,
      regenerate: chat.regenerate,
    };
  },
}));

// Constructing the real transport reaches for import.meta.env and builds a
// fetch pipeline; the stubbed useChat never uses it.
vi.mock("@/lib/chat", () => ({ chatTransport: {} }));

const { useStudioChat } = await import("../use-studio-chat.ts");

function textMessage(
  role: "user" | "assistant",
  text: string
): AnimusUIMessage {
  return {
    id: `${role}-${text}`,
    role,
    parts: [{ type: "text", text }],
  } as AnimusUIMessage;
}

function renderPart(
  output: Partial<RenderSceneOutput>,
  state: "output-available" | "input-available" = "output-available"
) {
  return {
    type: "tool-renderScene",
    toolCallId: `call-${output.videoKey ?? "none"}`,
    state,
    input: { file: "scene.py", scene: "Explainer", quality: "high" },
    output: {
      exitCode: 0,
      file: "scene.py",
      logs: "",
      ok: true,
      scene: "Explainer",
      ...output,
    },
  };
}

function renderMessage(...parts: unknown[]): AnimusUIMessage {
  return {
    id: `assistant-${parts.length}`,
    role: "assistant",
    parts,
  } as unknown as AnimusUIMessage;
}

describe("useStudioChat", () => {
  beforeEach(() => {
    chat.messages = [];
    chat.status = "ready";
    chat.error = undefined;
    chat.options = undefined;
    chat.sendMessage.mockReset();
    chat.sendMessage.mockResolvedValue(undefined);
    chat.addToolOutput.mockReset();
    chat.regenerate.mockReset();
    chat.stop.mockReset();
  });

  describe("phase", () => {
    it("is idle for an empty conversation with no prompt", () => {
      const { result } = renderHook(() =>
        useStudioChat({ chatId: "conversation-1" })
      );

      expect(result.current.phase).toBe("idle");
    });

    it("is loading while a fresh conversation boots from a prompt", () => {
      const { result } = renderHook(() =>
        useStudioChat({ chatId: "conversation-1", initialPrompt: "Explain X" })
      );

      expect(result.current.phase).toBe("loading");
    });

    it("is loading while the first turn streams, before any assistant text", () => {
      chat.messages = [textMessage("user", "Explain X")];
      chat.status = "streaming";

      const { result } = renderHook(() =>
        useStudioChat({ chatId: "conversation-1" })
      );

      expect(result.current.phase).toBe("loading");
    });

    it("is chat once the assistant has replied", () => {
      chat.messages = [
        textMessage("user", "Explain X"),
        textMessage("assistant", "Sure"),
      ];

      const { result } = renderHook(() =>
        useStudioChat({ chatId: "conversation-1" })
      );

      expect(result.current.phase).toBe("chat");
    });

    it("leaves the loading state when the initial send fails", async () => {
      chat.sendMessage.mockRejectedValue(new Error("out of credits"));

      const { result } = renderHook(() =>
        useStudioChat({ chatId: "conversation-1", initialPrompt: "Explain X" })
      );

      // Otherwise a refused turn leaves the studio spinning forever with no
      // way back to the prompt.
      await waitFor(() => expect(result.current.phase).toBe("idle"));
    });
  });

  describe("initial prompt", () => {
    it("sends it exactly once, even across re-renders", async () => {
      const { rerender } = renderHook(() =>
        useStudioChat({ chatId: "conversation-1", initialPrompt: "Explain X" })
      );

      await waitFor(() => expect(chat.sendMessage).toHaveBeenCalledTimes(1));
      expect(chat.sendMessage).toHaveBeenCalledWith({ text: "Explain X" });

      rerender();
      rerender();

      expect(chat.sendMessage).toHaveBeenCalledTimes(1);
    });

    it("does not replay it when the conversation already has messages", () => {
      // Router navigation state survives a hard refresh, so without this guard
      // reloading a conversation re-sends its opening prompt.
      renderHook(() =>
        useStudioChat({
          chatId: "conversation-1",
          initialPrompt: "Explain X",
          initialMessages: [textMessage("user", "Explain X")],
        })
      );

      expect(chat.sendMessage).not.toHaveBeenCalled();
    });

    it("sends nothing when there is no prompt", () => {
      renderHook(() => useStudioChat({ chatId: "conversation-1" }));

      expect(chat.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe("videoKey", () => {
    it("is undefined before any render succeeds", () => {
      chat.messages = [textMessage("assistant", "Working on it")];

      const { result } = renderHook(() =>
        useStudioChat({ chatId: "conversation-1" })
      );

      expect(result.current.videoKey).toBeUndefined();
    });

    it("takes the most recent successful render", () => {
      chat.messages = [
        renderMessage(renderPart({ videoKey: "videos/first.mp4" })),
        renderMessage(renderPart({ videoKey: "videos/second.mp4" })),
      ];

      const { result } = renderHook(() =>
        useStudioChat({ chatId: "conversation-1" })
      );

      expect(result.current.videoKey).toBe("videos/second.mp4");
    });

    it("ignores failed renders and keeps the last good one", () => {
      chat.messages = [
        renderMessage(renderPart({ videoKey: "videos/good.mp4" })),
        renderMessage(
          renderPart({ ok: false, exitCode: 1, videoKey: undefined })
        ),
      ];

      const { result } = renderHook(() =>
        useStudioChat({ chatId: "conversation-1" })
      );

      expect(result.current.videoKey).toBe("videos/good.mp4");
    });

    it("ignores a render that has not produced output yet", () => {
      chat.messages = [
        renderMessage(
          renderPart({ videoKey: "videos/pending.mp4" }, "input-available")
        ),
      ];

      const { result } = renderHook(() =>
        useStudioChat({ chatId: "conversation-1" })
      );

      expect(result.current.videoKey).toBeUndefined();
    });
  });

  describe("actions", () => {
    it("forwards send to the transport", () => {
      const { result } = renderHook(() =>
        useStudioChat({ chatId: "conversation-1" })
      );

      act(() => result.current.send("another question"));

      expect(chat.sendMessage).toHaveBeenCalledWith({
        text: "another question",
      });
    });

    it("forwards a HITL answer as tool output", () => {
      const { result } = renderHook(() =>
        useStudioChat({ chatId: "conversation-1" })
      );

      act(() =>
        result.current.respondToTool("askUserQuestion", "call-1", {
          selected: ["From scratch"],
        })
      );

      expect(chat.addToolOutput).toHaveBeenCalledWith({
        tool: "askUserQuestion",
        toolCallId: "call-1",
        output: { selected: ["From scratch"] },
      });
    });

    it("retries by regenerating the failed turn", () => {
      const { result } = renderHook(() =>
        useStudioChat({ chatId: "conversation-1" })
      );

      act(() => result.current.retry());

      expect(chat.regenerate).toHaveBeenCalledTimes(1);
    });

    it("exposes stop and the turn error verbatim", () => {
      chat.error = new Error("stream died");

      const { result } = renderHook(() =>
        useStudioChat({ chatId: "conversation-1" })
      );

      expect(result.current.error?.message).toBe("stream died");
      expect(result.current.stop).toBe(chat.stop);
    });
  });

  it("refreshes the sidebar and the credit gauge when a turn finishes", () => {
    const onConversationUpdated = vi.fn();
    const creditsChanged = vi.fn();
    window.addEventListener("animus:credits-changed", creditsChanged);

    renderHook(() =>
      useStudioChat({ chatId: "conversation-1", onConversationUpdated })
    );

    act(() => chat.options?.onFinish?.({}));

    expect(onConversationUpdated).toHaveBeenCalledTimes(1);
    expect(creditsChanged).toHaveBeenCalledTimes(1);
    window.removeEventListener("animus:credits-changed", creditsChanged);
  });

  it("keys the chat session by conversation id", () => {
    renderHook(() => useStudioChat({ chatId: "conversation-42" }));

    expect(chat.options?.id).toBe("conversation-42");
  });
});
