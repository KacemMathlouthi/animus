/** Keeps a streaming chat response alive through idle periods.
 *
 * The agent loop goes silent for as long as a tool takes. `renderScene` is
 * allowed 600 seconds, and it emits nothing while it runs, so the SSE connection
 * can sit with zero traffic for ten minutes. Every proxy between the container
 * and the browser reads that as a dead connection and closes it: a load
 * balancer's idle timeout (60s by default on an AWS ALB), a CDN's
 * between-packet timeout, and most corporate proxies. The user is then watching
 * a stream that no longer exists, and the studio has no failure to render.
 *
 * The fix is the standard one: emit an SSE comment while idle. A line starting
 * with `:` is a comment in the SSE grammar — the spec requires clients to
 * discard it, and the AI SDK's parser (eventsource-parser) does, reading it as
 * an empty field name and dropping the line. So this is invisible to the client
 * while still being traffic on the wire.
 *
 * Only the chat route needs this. Every other endpoint answers in milliseconds. */

/** An SSE comment carrying no data. The trailing blank line ends the "event". */
const SSE_HEARTBEAT = ": keep-alive\n\n";

/** Idle time before a heartbeat goes out. Comfortably under the tightest
 * intermediary timeout we expect (CloudFront's 30s origin read timeout; an ALB
 * defaults to 60s), and cheap enough at 14 bytes that being early costs
 * nothing. The timer restarts on every real chunk, so a busy stream never
 * emits one. */
export const HEARTBEAT_INTERVAL_MS = 15_000;

/** Wrap a streaming response so idle gaps carry heartbeats. Status and headers
 * are preserved. A response with no body is returned untouched. */
export function withSseHeartbeat(
  response: Response,
  intervalMs: number = HEARTBEAT_INTERVAL_MS
): Response {
  const body = response.body;
  if (!body) {
    return response;
  }

  const encoder = new TextEncoder();
  const reader = body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let finished = false;

  const clear = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Rescheduled on every real chunk, so the gap between any two writes is
      // never more than intervalMs.
      const schedule = () => {
        timer = setTimeout(() => {
          if (finished) {
            return;
          }
          controller.enqueue(encoder.encode(SSE_HEARTBEAT));
          schedule();
        }, intervalMs);
      };

      const pump = async () => {
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            clear();
            controller.enqueue(value);
            schedule();
          }
          finished = true;
          clear();
          controller.close();
        } catch (error) {
          finished = true;
          clear();
          controller.error(error);
        }
      };

      schedule();
      pump();
    },

    cancel(reason) {
      // The client went away (closed tab, dropped network). Stop the timer and
      // propagate so the upstream stream can tear down. Note this does NOT stop
      // the turn: the route consumes its own tee'd copy so settlement and
      // persistence still complete.
      finished = true;
      clear();
      return reader.cancel(reason);
    },
  });

  return new Response(stream, response);
}
