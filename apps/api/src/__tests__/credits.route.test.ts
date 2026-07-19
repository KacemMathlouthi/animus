import { FREE_GRANT_MICROS } from "@animus/core";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOrCreateCredits, listUsage } = vi.hoisted(() => ({
  getOrCreateCredits: vi.fn(),
  listUsage: vi.fn(),
}));

vi.mock("../services/credits.ts", () => ({ getOrCreateCredits, listUsage }));
vi.mock("../middleware/auth.ts", () => ({
  requireAuth: (_c: unknown, next: () => Promise<void>) => next(),
}));

const { creditsRoute } = await import("../routes/credits.ts");

type TestUser = { id: string } | null;

function appWith(user: TestUser) {
  const app = new Hono<{ Variables: { user: TestUser } }>();
  app.use("*", async (c, next) => {
    c.set("user", user);
    await next();
  });
  app.route("/credits", creditsRoute);
  return app;
}

beforeEach(() => {
  getOrCreateCredits.mockReset();
  listUsage.mockReset();
});

describe("GET /credits", () => {
  it("returns the caller's balance and grant", async () => {
    getOrCreateCredits.mockResolvedValue({
      balanceMicros: 4_200_000,
      grantMicros: FREE_GRANT_MICROS,
    });

    const res = await appWith({ id: "u1" }).request("/credits");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      balanceMicros: 4_200_000,
      grantMicros: FREE_GRANT_MICROS,
    });
    expect(getOrCreateCredits).toHaveBeenCalledWith("u1");
  });
});

describe("GET /credits/usage", () => {
  const emptyPage = { items: [], total: 0, limit: 20, offset: 0 };

  it("returns the caller's usage page with defaults", async () => {
    const page = {
      items: [
        {
          id: "evt-1",
          conversationId: "c1",
          conversationTitle: "Fourier transforms",
          turnId: "turn-1",
          model: "us.anthropic.claude-sonnet-5",
          inputTokens: 1200,
          outputTokens: 400,
          ttsChars: 900,
          costMicros: 12_345,
          createdAt: "2026-07-19T12:00:00.000Z",
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    };
    listUsage.mockResolvedValue(page);

    const res = await appWith({ id: "u1" }).request("/credits/usage");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(page);
    expect(listUsage).toHaveBeenCalledWith({
      userId: "u1",
      limit: 20,
      offset: 0,
    });
  });

  it("passes limit and offset through", async () => {
    listUsage.mockResolvedValue(emptyPage);

    await appWith({ id: "u1" }).request("/credits/usage?limit=5&offset=40");

    expect(listUsage).toHaveBeenCalledWith({
      userId: "u1",
      limit: 5,
      offset: 40,
    });
  });

  it("clamps out-of-range values and defaults malformed ones", async () => {
    listUsage.mockResolvedValue(emptyPage);

    await appWith({ id: "u1" }).request("/credits/usage?limit=9999&offset=-3");
    expect(listUsage).toHaveBeenCalledWith({
      userId: "u1",
      limit: 100,
      offset: 0,
    });

    await appWith({ id: "u1" }).request("/credits/usage?limit=abc&offset=xyz");
    expect(listUsage).toHaveBeenLastCalledWith({
      userId: "u1",
      limit: 20,
      offset: 0,
    });
  });
});
