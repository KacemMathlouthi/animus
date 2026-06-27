import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { sql } = vi.hoisted(() => ({ sql: vi.fn() }));

vi.mock("@animus/db", () => ({ sql }));

const { healthRoute } = await import("../routes/health.ts");

function app() {
  const a = new Hono();
  a.route("/health", healthRoute);
  return a;
}

beforeEach(() => {
  sql.mockReset();
});

describe("GET /health", () => {
  it("reports ok when the database round-trip succeeds", async () => {
    sql.mockResolvedValue([{ "?column?": 1 }]);

    const res = await app().request("/health");

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      database: string;
      uptime: number;
    };
    expect(body.status).toBe("ok");
    expect(body.database).toBe("up");
    expect(typeof body.uptime).toBe("number");
  });

  it("reports degraded with 503 when the database is unreachable", async () => {
    sql.mockRejectedValue(new Error("connection refused"));

    const res = await app().request("/health");

    expect(res.status).toBe(503);
    const body = (await res.json()) as { status: string; database: string };
    expect(body.status).toBe("degraded");
    expect(body.database).toBe("down");
  });
});
