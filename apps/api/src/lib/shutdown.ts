/** Graceful shutdown for the long-lived API process.
 *
 * Container hosts stop a task by sending SIGTERM, waiting a grace period, then
 * SIGKILLing. Without a handler the process dies the instant the grace period
 * ends: connections are cut mid-response and the Postgres pool never closes, so
 * every deploy drops whatever was in flight.
 *
 * What this can and cannot save. Stopping the server lets requests that are
 * nearly done finish, and closing the pool cleanly returns connections to Neon
 * instead of leaving them to time out. A render turn holding an SSE stream for
 * minutes will NOT finish inside any host's grace period — nothing at this layer
 * can change that, and the durable fix is checkpointing the turn rather than
 * waiting on it. So the wait is bounded: a deploy must not hang on work that
 * cannot complete. */

import { logger } from "./logger.ts";

/** How long to wait for in-flight work, in seconds. Stays under the shortest
 * host grace period we deploy on (30s on Vercel; ECS defaults to 30s and allows
 * up to 120s), so the pool always closes before SIGKILL rather than being cut
 * off mid-drain. */
export const DRAIN_TIMEOUT_SEC = 20;

export interface ShutdownDeps {
  /** Close the database pool, waiting at most `timeoutSec` for live queries. */
  closePool: (timeoutSec: number) => Promise<void>;
  /** Terminate the process. Injected so tests can observe it. */
  exit: (code: number) => void;
  /** Stop accepting new connections; resolves when in-flight requests settle. */
  stopServer: () => Promise<void>;
}

/** Resolve when `work` settles or `ms` elapses, whichever comes first. The timer
 * is always cleared so a fast drain doesn't hold the event loop open. */
async function withDeadline(work: Promise<unknown>, ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  try {
    await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/** Build the signal handler. Idempotent: a second signal during a drain (an
 * impatient orchestrator sends more than one) is ignored rather than closing the
 * pool twice or exiting mid-drain. Neither step is allowed to throw past this
 * boundary — a failed drain must still reach `exit`, or the host waits out the
 * whole grace period for nothing. */
export function createShutdownHandler(
  deps: ShutdownDeps
): (signal: string) => Promise<void> {
  let draining = false;

  return async (signal: string) => {
    if (draining) {
      logger.info({ signal }, "shutdown already in progress, ignoring signal");
      return;
    }
    draining = true;
    logger.info(
      { drainTimeoutSec: DRAIN_TIMEOUT_SEC, signal },
      "shutting down"
    );

    try {
      await withDeadline(deps.stopServer(), DRAIN_TIMEOUT_SEC * 1000);
    } catch (error) {
      logger.error({ err: error }, "failed to stop the server cleanly");
    }

    try {
      await deps.closePool(DRAIN_TIMEOUT_SEC);
    } catch (error) {
      logger.error({ err: error }, "failed to close the database pool cleanly");
    }

    logger.info("shutdown complete");
    deps.exit(0);
  };
}

/** Wire the handler to the signals a container host actually sends. SIGINT is
 * included so local Ctrl-C takes the same path the deploy does. */
export function registerShutdownHandlers(deps: ShutdownDeps): void {
  const handler = createShutdownHandler(deps);
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      // The handler swallows its own failures; this keeps the rejection
      // impossible rather than merely unlikely.
      handler(signal).catch((error: unknown) => {
        logger.error({ err: error }, "shutdown handler failed");
      });
    });
  }
}
