/** Liveness + readiness. 200 when the API and its database are both reachable,
 * 503 if the database round-trip fails. */

import { sql } from "@animus/db";
import { Hono } from "hono";

export const healthRoute = new Hono();

healthRoute.get("/", async (c) => {
  let database: "up" | "down" = "up";
  try {
    await sql`select 1`;
  } catch {
    database = "down";
  }

  return c.json(
    {
      status: database === "up" ? "ok" : "degraded",
      database,
      uptime: process.uptime(),
    },
    database === "up" ? 200 : 503
  );
});
