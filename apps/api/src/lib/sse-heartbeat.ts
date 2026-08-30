/** A silent `renderScene` can leave the SSE connection with zero traffic for
 * ten minutes, which every proxy in between reads as dead and closes. Emitting
 * an SSE comment keeps the wire busy; the spec has clients discard it, so it is
 * invisible to the browser. Only the chat route is slow enough to need this. */

const SSE_HEARTBEAT = ": keep-alive\n\n";

/** Under the tightest intermediary timeout (CloudFront reads at 30s, an ALB at
 * 60s). The timer restarts on every real chunk, so a busy stream emits none. */
export const HEARTBEAT_INTERVAL_MS = 15_000;

/** Status and headers are preserved; a bodiless response passes through. */
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
      // Rescheduled per chunk, so no gap between writes exceeds intervalMs.
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
      // The client went away. This does NOT stop the turn: the route consumes
      // its own tee'd copy, so settlement and persistence still complete.
      finished = true;
      clear();
      return reader.cancel(reason);
    },
  });

  return new Response(stream, response);
}
