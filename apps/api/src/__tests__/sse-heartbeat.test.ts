import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HEARTBEAT_INTERVAL_MS,
  withSseHeartbeat,
} from "../lib/sse-heartbeat.ts";

const HEARTBEAT = ": keep-alive\n\n";

/** A stream fed by hand, so a test controls exactly when the agent "speaks". */
function manualStream() {
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  return {
    close: () => controller.close(),
    fail: (error: Error) => controller.error(error),
    stream,
    write: (text: string) => controller.enqueue(encoder.encode(text)),
  };
}

async function drain(response: Response): Promise<string> {
  const decoder = new TextDecoder();
  const reader = response.body?.getReader();
  if (!reader) {
    return "";
  }
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("withSseHeartbeat", () => {
  it("emits a heartbeat once the stream has been idle for the interval", async () => {
    // The renderScene case: the agent says nothing for minutes.
    const source = manualStream();
    const wrapped = withSseHeartbeat(new Response(source.stream));
    const collected = drain(wrapped);

    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 3);
    source.close();

    expect(await collected).toBe(HEARTBEAT.repeat(3));
  });

  it("passes real chunks through untouched", async () => {
    const source = manualStream();
    const wrapped = withSseHeartbeat(new Response(source.stream));
    const collected = drain(wrapped);

    source.write('data: {"type":"start"}\n\n');
    source.write('data: {"type":"finish"}\n\n');
    source.close();

    expect(await collected).toBe(
      'data: {"type":"start"}\n\ndata: {"type":"finish"}\n\n'
    );
  });

  it("does not emit a heartbeat while the stream is busy", async () => {
    // A chunk arriving before the deadline restarts the timer, so a chatty
    // turn never pays for keep-alives.
    const source = manualStream();
    const wrapped = withSseHeartbeat(new Response(source.stream));
    const collected = drain(wrapped);

    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS - 1000);
      source.write("data: chunk\n\n");
    }
    source.close();

    expect(await collected).toBe("data: chunk\n\n".repeat(4));
  });

  it("resumes heartbeats after a chunk breaks the silence", async () => {
    const source = manualStream();
    const wrapped = withSseHeartbeat(new Response(source.stream));
    const collected = drain(wrapped);

    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS);
    source.write("data: tool-done\n\n");
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS);
    source.close();

    expect(await collected).toBe(`${HEARTBEAT}data: tool-done\n\n${HEARTBEAT}`);
  });

  it("preserves status and headers", () => {
    const source = manualStream();
    const wrapped = withSseHeartbeat(
      new Response(source.stream, {
        headers: { "content-type": "text/event-stream" },
        status: 200,
      })
    );

    expect(wrapped.status).toBe(200);
    expect(wrapped.headers.get("content-type")).toBe("text/event-stream");
  });

  it("returns a bodyless response untouched", () => {
    const response = new Response(null, { status: 204 });
    expect(withSseHeartbeat(response)).toBe(response);
  });

  it("propagates an upstream error instead of heartbeating forever", async () => {
    const source = manualStream();
    const wrapped = withSseHeartbeat(new Response(source.stream));

    source.fail(new Error("upstream exploded"));

    await expect(drain(wrapped)).rejects.toThrow("upstream exploded");
  });

  it("stops the timer when the client disconnects", async () => {
    // Nothing may be enqueued after a cancel, or the stream errors on a closed
    // controller long after the tab was shut.
    const source = manualStream();
    const wrapped = withSseHeartbeat(new Response(source.stream));
    const reader = wrapped.body?.getReader();

    await reader?.cancel("client gone");
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 5);

    expect(vi.getTimerCount()).toBe(0);
  });

  it("honours a custom interval", async () => {
    const source = manualStream();
    const wrapped = withSseHeartbeat(new Response(source.stream), 1000);
    const collected = drain(wrapped);

    await vi.advanceTimersByTimeAsync(2000);
    source.close();

    expect(await collected).toBe(HEARTBEAT.repeat(2));
  });
});
