/** The Hono application and server entry. Global middleware, then mounted route
 * groups. The default export is what Bun reads to start the HTTP server. */

import { auth } from "@animus/auth";
import { getServerEnv } from "@animus/core/env";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "./lib/logger.ts";
import { sessionMiddleware } from "./middleware/auth.ts";
import { onError, onNotFound } from "./middleware/error.ts";
import { requestLogger } from "./middleware/logger.ts";
import { initTelemetry } from "./observability/telemetry.ts";
import { chatRoute } from "./routes/chat.ts";
import { conversationsRoute } from "./routes/conversations.ts";
import { healthRoute } from "./routes/health.ts";
import { mediaRoute } from "./routes/media.ts";
import { settingsRoute } from "./routes/settings.ts";
import { shareRoute } from "./routes/share.ts";
import type { AppEnv } from "./types.ts";

const env = getServerEnv();

// Register the LLM tracer provider before any agent runs.
initTelemetry();

export const app = new Hono<AppEnv>();

app.use("*", requestLogger);

// Allow the web app to call us with cookies (credentials) from its origin.
app.use(
  "*",
  cors({
    origin: env.webOrigin,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

// Hand the whole /api/auth/* surface to Better Auth. This one line exposes
// sign-in, OAuth callbacks, magic-link verify, sign-out, get-session, etc.
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Every other route gets the resolved user/session on its context.
app.use("*", sessionMiddleware);

app.onError(onError);
app.notFound(onNotFound);

// A tiny root response so hitting the base URL isn't a 404.
app.get("/", (c) => c.json({ name: "animus-api", status: "ok" }));

app.route("/health", healthRoute);
app.route("/api/settings", settingsRoute);
app.route("/api/conversations", conversationsRoute);
app.route("/api/chat", chatRoute);
app.route("/api/media", mediaRoute);
// Public (unauthenticated) — anyone with an unlisted token can resolve a share.
app.route("/api/share", shareRoute);

export type AppType = typeof app;

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
