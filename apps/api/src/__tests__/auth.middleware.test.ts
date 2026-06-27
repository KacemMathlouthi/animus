import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, loggerError } = vi.hoisted(() => ({
  getSession: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@animus/auth", () => ({ auth: { api: { getSession } } }));
vi.mock("../lib/logger.ts", () => ({
  logger: { error: loggerError },
}));

const { requireAuth, sessionMiddleware } = await import(
  "../middleware/auth.ts"
);

type TestUser = { id: string } | null;
type TestSession = { id: string } | null;

beforeEach(() => {
  getSession.mockReset();
  loggerError.mockReset();
});

describe("sessionMiddleware", () => {
  function appWithSession() {
    const app = new Hono<{
      Variables: { user: TestUser; session: TestSession };
    }>();
    app.use("*", sessionMiddleware);
    app.get("/whoami", (c) =>
      c.json({ user: c.get("user"), session: c.get("session") })
    );
    return app;
  }

  it("attaches the resolved user and session to the context", async () => {
    const user = { id: "u1" };
    const session = { id: "s1" };
    getSession.mockResolvedValue({ user, session });

    const res = await appWithSession().request("/whoami");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user, session });
    expect(getSession).toHaveBeenCalledTimes(1);
  });

  it("sets user and session to null when no session is resolved", async () => {
    getSession.mockResolvedValue(null);

    const res = await appWithSession().request("/whoami");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: null, session: null });
  });

  it("continues with a null user when getSession throws", async () => {
    getSession.mockRejectedValue(new Error("db down"));

    const res = await appWithSession().request("/whoami");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: null, session: null });
    expect(loggerError).toHaveBeenCalledTimes(1);
  });
});

describe("requireAuth", () => {
  function appWithGuard(user: TestUser) {
    const app = new Hono<{ Variables: { user: TestUser } }>();
    app.use("*", async (c, next) => {
      c.set("user", user);
      await next();
    });
    app.use("*", requireAuth);
    app.get("/protected", (c) => c.json({ ok: true }));
    return app;
  }

  it("401s when no user is present", async () => {
    const res = await appWithGuard(null).request("/protected");

    expect(res.status).toBe(401);
  });

  it("calls next when a user is present", async () => {
    const res = await appWithGuard({ id: "u1" }).request("/protected");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
