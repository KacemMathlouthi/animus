/** HTTPExceptions keep their status; anything else logs and 500s. Bodies are
 * always `{ message, code? }` JSON, which the web's ApiError parser reads —
 * HTTPException's own getResponse() emits text/plain and loses the message. */

import type { ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../lib/logger.ts";

export const onError: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    // A Response attached via `{ res }` wins.
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
