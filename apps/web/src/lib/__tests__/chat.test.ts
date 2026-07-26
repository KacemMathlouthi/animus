import { OUT_OF_CREDITS } from "@animus/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { DefaultChatTransport } = vi.hoisted(() => ({
  DefaultChatTransport: vi.fn(),
}));

// Capture the transport options instead of standing up a stream: the pieces
// worth testing are the 402 interceptor and the request shaping.
vi.mock("ai", () => ({ DefaultChatTransport }));

await import("@/lib/chat");

const CHAT_ENDPOINT = /\/api\/chat$/;

interface TransportOptions {
  api: string;
  credentials: string;
  fetch: typeof fetch;
  prepareSendMessagesRequest: (input: { id: string; messages: unknown[] }) => {
    body: unknown;
  };
}

const options = DefaultChatTransport.mock.calls[0]?.[0] as TransportOptions;

function jsonResponse(body: unknown, status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("chat transport", () => {
  it("points at the streaming chat endpoint with credentials", () => {
    expect(options.api).toMatch(CHAT_ENDPOINT);
    expect(options.credentials).toBe("include");
  });

  it("sends only the newest message, not the whole transcript", () => {
    // The DB is authoritative; re-uploading history would both cost tokens and
    // let a stale client overwrite the server's view of the conversation.
    const request = options.prepareSendMessagesRequest({
      id: "conversation-1",
      messages: [{ id: "m1" }, { id: "m2" }, { id: "m3" }],
    });

    expect(request.body).toEqual({
      id: "conversation-1",
      message: { id: "m3" },
    });
  });

  describe("credit gate", () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("passes a normal response straight through", async () => {
      const response = jsonResponse({}, 200);
      fetchMock.mockResolvedValue(response);

      await expect(options.fetch("/api/chat")).resolves.toBe(response);
    });

    it("turns a 402 into a typed error and signals the UI", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          { code: OUT_OF_CREDITS, message: "You are out of credits" },
          402
        )
      );
      const depleted = vi.fn();
      const changed = vi.fn();
      window.addEventListener("animus:out-of-credits", depleted);
      window.addEventListener("animus:credits-changed", changed);

      // A 402 arrives as JSON, not SSE, so without this it would surface as an
      // opaque stream error instead of the depletion dialog.
      await expect(options.fetch("/api/chat")).rejects.toMatchObject({
        status: 402,
        code: OUT_OF_CREDITS,
      });
      expect(depleted).toHaveBeenCalledTimes(1);
      expect(changed).toHaveBeenCalledTimes(1);

      window.removeEventListener("animus:out-of-credits", depleted);
      window.removeEventListener("animus:credits-changed", changed);
    });

    it("still throws on a 402 that is not the credit code, without opening the dialog", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ code: "SOMETHING_ELSE" }, 402)
      );
      const depleted = vi.fn();
      window.addEventListener("animus:out-of-credits", depleted);

      await expect(options.fetch("/api/chat")).rejects.toMatchObject({
        status: 402,
      });
      expect(depleted).not.toHaveBeenCalled();

      window.removeEventListener("animus:out-of-credits", depleted);
    });

    it("handles a 402 whose body is not JSON", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 402,
        json: () => Promise.reject(new Error("not json")),
      } as unknown as Response);

      await expect(options.fetch("/api/chat")).rejects.toThrow(
        "Out of credits"
      );
    });
  });
});
