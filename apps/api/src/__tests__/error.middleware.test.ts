import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { loggerError } = vi.hoisted(() => ({ loggerError: vi.fn() }));

vi.mock("../lib/logger.ts", () => ({
  logger: { error: loggerError },
}));

const { onError, onNotFound } = await import("../middleware/error.ts");

function appThatThrows(error: unknown) {
  const app = new Hono();
  app.onError(onError);
  app.notFound(onNotFound);
  app.get("/boom", () => {
    throw error;
  });
  return app;
}

beforeEach(() => {
  loggerError.mockReset();
});

describe("onError", () => {
  it("renders an HTTPException as JSON with its status and message", async () => {
    const res = await appThatThrows(
      new HTTPException(403, { message: "Forbidden" })
    ).request("/boom");

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ message: "Forbidden" });
    expect(loggerError).not.toHaveBeenCalled();
  });

  it("keeps a custom Response attached to an HTTPException", async () => {
    const res = await appThatThrows(
      new HTTPException(401, { res: new Response("custom", { status: 401 }) })
    ).request("/boom");

    expect(res.status).toBe(401);
    expect(await res.text()).toBe("custom");
  });

  it("returns a generic 500 for any other error and logs it", async () => {
    const res = await appThatThrows(new Error("kaboom")).request("/boom");

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Internal Server Error" });
    expect(loggerError).toHaveBeenCalledTimes(1);
  });
});

describe("onNotFound", () => {
  it("returns a 404 for unknown routes", async () => {
    const app = new Hono();
    app.notFound(onNotFound);

    const res = await app.request("/nope");

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ message: "Not Found" });
  });
});
