/** Liveness + readiness. 200 when the API, its database, and the bundled
 * share-card assets are all present, 503 when any check fails — a build
 * shipped without apps/api/assets must be visible here, not discovered on the
 * first OG request (assets load lazily precisely so boot survives). */

import { sql } from "@animus/db";
import { Hono } from "hono";
import { shareCardAssetsPresent } from "../lib/og.ts";

export const healthRoute = new Hono();

healthRoute.get("/", async (c) => {
  let database: "up" | "down" = "up";
  try {
    await sql`select 1`;
  } catch {
    database = "down";
  }

  const assets: "up" | "down" = shareCardAssetsPresent() ? "up" : "down";
  const healthy = database === "up" && assets === "up";

  return c.json(
    {
      status: healthy ? "ok" : "degraded",
      database,
      assets,
      uptime: process.uptime(),
    },
    healthy ? 200 : 503
  );
});
