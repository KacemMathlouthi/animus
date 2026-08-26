/** Bun server entry: runs the Hono app as a long-lived process for local dev and
 * container hosts. Disables the idle timeout on the streaming chat route so a turn
 * can hold its SSE connection open — a Bun-native capability serverless lacks.
 *
 * Uses `Bun.serve` rather than a default export so the server handle is available
 * to the shutdown drain (see lib/shutdown.ts); a container host stops this
 * process with SIGTERM on every deploy. */

import { getServerEnv } from "@animus/core/env";
import { sql } from "@animus/db";
import { app } from "./app.ts";
import { logger } from "./lib/logger.ts";
import { registerShutdownHandlers } from "./lib/shutdown.ts";

const env = getServerEnv();

const server = Bun.serve({
  port: env.port,
  fetch(
    request: Request,
    srv: Bun.Server<unknown>
  ): Response | Promise<Response> {
    if (new URL(request.url).pathname.startsWith("/api/chat")) {
      srv.timeout(request, 0);
    }
    return app.fetch(request);
  },
});

registerShutdownHandlers({
  closePool: (timeoutSec) => sql.end({ timeout: timeoutSec }),
  exit: (code) => process.exit(code),
  stopServer: () => server.stop(),
});

logger.info(`animus-api listening on http://localhost:${env.port}`);
