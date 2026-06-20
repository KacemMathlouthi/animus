/** The streaming chat endpoint. Each request runs one turn of the agent's
 * tool-loop and streams the result back as a UI-message stream the web's
 * useChat consumes. Persistence (conversations/messages) lands once the shape
 * settles; for now this is stateless. */

import { createManimAgent } from "@animus/agent";
import { convertToModelMessages, type UIMessage } from "ai";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requireAuth } from "../middleware/auth.ts";
import type { AppEnv } from "../types.ts";

export const chatRoute = new Hono<AppEnv>();

chatRoute.use("*", requireAuth);

chatRoute.post("/", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    messages?: UIMessage[];
  } | null;

  if (!body?.messages) {
    throw new HTTPException(400, { message: "messages is required" });
  }

  const agent = createManimAgent();
  const result = await agent.stream({
    abortSignal: c.req.raw.signal,
    prompt: await convertToModelMessages(body.messages),
  });

  return result.toUIMessageStreamResponse();
});
