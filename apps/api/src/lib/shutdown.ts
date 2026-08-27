/** Graceful shutdown. Without it every deploy cuts connections mid-response
 * and leaks Postgres connections. A minutes-long render will not finish inside
 * any grace period, so the wait is bounded rather than open-ended. */

import { logger } from "./logger.ts";

/** Under the shortest host grace period (30s on Vercel and ECS), so the pool
 * closes before SIGKILL rather than being cut off mid-drain. */
export const DRAIN_TIMEOUT_SEC = 20;

export interface ShutdownDeps {
  closePool: (timeoutSec: number) => Promise<void>;
  /** Injected so tests can observe it. */
  exit: (code: number) => void;
  stopServer: () => Promise<void>;
}

/** The timer is always cleared so a fast drain does not hold the loop open. */
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

/** Idempotent, because an impatient orchestrator sends more than one signal.
 * Nothing may throw past this boundary: a failed drain must still reach `exit`
 * or the host waits out the entire grace period for nothing. */
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

/** SIGINT is included so local Ctrl-C takes the same path a deploy does. */
export function registerShutdownHandlers(deps: ShutdownDeps): void {
  const handler = createShutdownHandler(deps);
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      // The handler swallows its own failures; this makes it certain.
      handler(signal).catch((error: unknown) => {
        logger.error({ err: error }, "shutdown handler failed");
      });
    });
  }
}
