import type { User } from "@animus/auth";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { describe, expect, it } from "vitest";
import { userId } from "../lib/user.ts";
import type { AppEnv } from "../types.ts";

type TestUser = { id: string } | null;

function appWith(user: TestUser) {
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    c.set("user", user as unknown as User | null);
    await next();
  });
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ status: err.status }, err.status);
    }
    throw err;
  });
  app.get("/id", (c) => c.json({ id: userId(c) }));
  return app;
}

describe("userId", () => {
  it("returns the user id when a user is present", async () => {
    const res = await appWith({ id: "u1" }).request("/id");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "u1" });
  });

  it("throws a 401 HTTPException when no user is present", async () => {
    const res = await appWith(null).request("/id");

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ status: 401 });
  });
});
