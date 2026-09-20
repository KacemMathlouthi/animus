/** Liveness and readiness, split: the load balancer polls `/health`, which must
 * touch nothing external — a probe querying Postgres defeated Neon's autosuspend
 * and turned the outage into a restart loop. `/ready` checks deps, nothing acts on it. */

import { sql } from "@animus/db";
import { Hono } from "hono";
import { shareCardAssetsPresent } from "../lib/og.ts";

export const healthRoute = new Hono();
export const readyRoute = new Hono();

healthRoute.get("/", (c) => {
  const assets: "up" | "down" = shareCardAssetsPresent() ? "up" : "down";

  return c.json(
    {
      status: assets === "up" ? "ok" : "degraded",
      assets,
      uptime: process.uptime(),
    },
    assets === "up" ? 200 : 503
  );
});

readyRoute.get("/", async (c) => {
  let database: "up" | "down" = "up";
  try {
    await sql`select 1`;
  } catch {
    database = "down";
  }

  const assets: "up" | "down" = shareCardAssetsPresent() ? "up" : "down";
  const ready = database === "up" && assets === "up";

  return c.json(
    {
      status: ready ? "ok" : "degraded",
      database,
      assets,
      uptime: process.uptime(),
    },
    ready ? 200 : 503
  );
});
