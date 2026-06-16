/** Centralised error handling. Known errors (thrown as HTTPException) keep their
 * intended status; anything else is logged and returned as a generic 500 so we
 * never leak internals to clients. */

import type { ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../lib/logger.ts";

export const onError: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  logger.error({ err }, "Unhandled error");
  return c.json({ error: "Internal Server Error" }, 500);
};

export const onNotFound: NotFoundHandler = (c) =>
  c.json({ error: "Not Found" }, 404);
