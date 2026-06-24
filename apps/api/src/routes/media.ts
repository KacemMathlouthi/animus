/** Serves rendered videos saved by the agent's renderScene tool. Intentionally
 * unauthenticated for v0.1 so the browser's <video> element (a cross-origin
 * subresource that won't carry the session cookie) can load it; the URLs carry
 * a random per-render id. Auth/signed URLs come with the R2 migration. */

import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { mediaRoot } from "../lib/media.ts";

const MP4_NAME = /^[\w-]+\.mp4$/;

export const mediaRoute = new Hono();

mediaRoute.get("/:conversationId/:file", async (c) => {
  // basename strips any path-traversal; the regex pins the shape.
  const conversationId = basename(c.req.param("conversationId"));
  const file = basename(c.req.param("file"));
  if (!MP4_NAME.test(file)) {
    throw new HTTPException(400, { message: "Invalid media path" });
  }

  try {
    const bytes = await readFile(join(mediaRoot(), conversationId, file));
    return new Response(bytes, {
      headers: {
        "content-type": "video/mp4",
        "cache-control": "private, max-age=3600",
      },
    });
  } catch {
    throw new HTTPException(404, { message: "Media not found" });
  }
});
