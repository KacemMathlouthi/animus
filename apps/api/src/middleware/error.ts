/** Centralised error handling. Known errors (thrown as HTTPException) keep their
 * intended status; anything else is logged and returned as a generic 500 so we
 * never leak internals to clients.
 *
 * Every error body is JSON of the shape `{ message, code? }` — the contract the
 * web's ApiError parser reads. HTTPException's own getResponse() would emit
 * text/plain, reducing every server message to the client's generic fallback. */

import type { ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../lib/logger.ts";

export const onError: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    // An explicitly attached Response (constructed with `{ res }`) wins.
    if (err.res) {
      return err.res;
    }
    return c.json({ message: err.message }, err.status);
  }
  logger.error({ err }, "Unhandled error");
  return c.json({ message: "Internal Server Error" }, 500);
};

export const onNotFound: NotFoundHandler = (c) =>
  c.json({ message: "Not Found" }, 404);
