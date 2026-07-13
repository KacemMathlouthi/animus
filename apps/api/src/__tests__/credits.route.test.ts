import { FREE_GRANT_MICROS } from "@animus/core";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOrCreateCredits } = vi.hoisted(() => ({
  getOrCreateCredits: vi.fn(),
}));

vi.mock("../services/credits.ts", () => ({ getOrCreateCredits }));
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
