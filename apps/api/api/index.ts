/** Vercel serverless entry, executed on Vercel's Bun runtime ("bunVersion" in
 * vercel.json) so the source-first workspace (.ts import specifiers, @animus/*
 * packages) resolves at runtime exactly as it does locally. Used ONLY on
 * Vercel — local and container runs go through ../src/server.ts.
 *
 * NOTE: maxDuration is pinned to the Hobby-plan ceiling (300s). A chat turn whose
 * render/repair loop streams past 5 minutes is terminated by the platform with a
 * 504. That is a known limitation of hosting the streaming API on serverless;
 * the container entry (src/server.ts) has no such cap. */

import { app } from "../src/app.ts";

export const config = { maxDuration: 300 };

export default {
  fetch(request: Request): Response | Promise<Response> {
    return app.fetch(request);
  },
};
