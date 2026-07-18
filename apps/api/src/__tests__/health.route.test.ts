import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { sql, shareCardAssetsPresent } = vi.hoisted(() => ({
  sql: vi.fn(),
  shareCardAssetsPresent: vi.fn(),
}));

vi.mock("@animus/db", () => ({ sql }));
vi.mock("../lib/og.ts", () => ({ shareCardAssetsPresent }));

const { healthRoute } = await import("../routes/health.ts");

function app() {
  const a = new Hono();
  a.route("/health", healthRoute);
  return a;
}

beforeEach(() => {
  sql.mockReset();
  shareCardAssetsPresent.mockReset();
  shareCardAssetsPresent.mockReturnValue(true);
});

describe("GET /health", () => {
  it("reports ok when the database round-trip succeeds", async () => {
    sql.mockResolvedValue([{ "?column?": 1 }]);

    const res = await app().request("/health");

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      database: string;
      assets: string;
      uptime: number;
    };
    expect(body.status).toBe("ok");
    expect(body.database).toBe("up");
    expect(body.assets).toBe("up");
    expect(typeof body.uptime).toBe("number");
  });

  it("reports degraded with 503 when the share-card assets are missing", async () => {
    sql.mockResolvedValue([{ "?column?": 1 }]);
    shareCardAssetsPresent.mockReturnValue(false);

    const res = await app().request("/health");

    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      status: string;
      database: string;
      assets: string;
    };
    expect(body.status).toBe("degraded");
    expect(body.database).toBe("up");
    expect(body.assets).toBe("down");
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
