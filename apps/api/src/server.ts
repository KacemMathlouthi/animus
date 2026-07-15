/** Bun server entry: runs the Hono app as a long-lived process for local dev and
 * container hosts (Railway/DO/App Runner). Disables the idle timeout on the
 * streaming chat route so a turn can hold its SSE connection open for the full
 * render/repair loop — a Bun-native capability serverless platforms lack. */

import { getServerEnv } from "@animus/core/env";
import { app } from "./app.ts";
import { logger } from "./lib/logger.ts";

const env = getServerEnv();

logger.info(`animus-api listening on http://localhost:${env.port}`);

export default {
  port: env.port,
  fetch(
    request: Request,
    server: Bun.Server<unknown>
  ): Response | Promise<Response> {
    if (new URL(request.url).pathname.startsWith("/api/chat")) {
      server.timeout(request, 0);
    }
    return app.fetch(request);
  },
};
