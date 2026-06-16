/** Per-request logging: one structured line with method, path, status and how
 * long the handler took. Replaces Hono's built-in logger so everything flows
 * through the same pino instance and formatting. */

import type { MiddlewareHandler } from "hono";
import { logger } from "../lib/logger.ts";

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = performance.now();
  await next();
  const durationMs = Math.round(performance.now() - start);
  const { method } = c.req;
  const { path } = c.req;
  const { status } = c.res;

  logger.info(
    { method, path, status, durationMs },
    `${method} ${path} ${status} ${durationMs}ms`
  );
};
