import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/logger.ts", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { DRAIN_TIMEOUT_SEC, createShutdownHandler } = await import(
  "../lib/shutdown.ts"
);

function deps(overrides: Partial<Parameters<typeof createShutdownHandler>[0]>) {
  return {
    closePool: vi.fn().mockResolvedValue(undefined),
    exit: vi.fn(),
    stopServer: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("createShutdownHandler", () => {
  it("stops the server, then closes the pool, then exits", async () => {
    const order: string[] = [];
    const d = deps({
      closePool: vi.fn().mockImplementation(() => {
        order.push("closePool");
        return Promise.resolve();
      }),
      exit: vi.fn().mockImplementation(() => {
        order.push("exit");
      }),
      stopServer: vi.fn().mockImplementation(() => {
        order.push("stopServer");
        return Promise.resolve();
      }),
    });

    await createShutdownHandler(d)("SIGTERM");

    expect(order).toEqual(["stopServer", "closePool", "exit"]);
    expect(d.exit).toHaveBeenCalledWith(0);
  });

  it("gives the pool the drain budget so live queries can finish", async () => {
    const d = deps({});
    await createShutdownHandler(d)("SIGTERM");
    expect(d.closePool).toHaveBeenCalledWith(DRAIN_TIMEOUT_SEC);
  });

  it("ignores a second signal while already draining", async () => {
    // An impatient orchestrator sends SIGTERM more than once; closing the pool
    // twice or exiting mid-drain would be worse than waiting.
    let release: (() => void) | undefined;
    const d = deps({
      stopServer: vi.fn().mockReturnValue(
        new Promise<void>((resolve) => {
          release = resolve;
        })
      ),
    });
    const handler = createShutdownHandler(d);

    const first = handler("SIGTERM");
    await handler("SIGTERM");

    expect(d.closePool).not.toHaveBeenCalled();
    expect(d.exit).not.toHaveBeenCalled();

    release?.();
    await first;

    expect(d.stopServer).toHaveBeenCalledTimes(1);
    expect(d.closePool).toHaveBeenCalledTimes(1);
    expect(d.exit).toHaveBeenCalledTimes(1);
  });

  it("still closes the pool and exits when stopping the server throws", async () => {
    const d = deps({
      stopServer: vi.fn().mockRejectedValue(new Error("socket already gone")),
    });

    await createShutdownHandler(d)("SIGTERM");

    expect(d.closePool).toHaveBeenCalledOnce();
    expect(d.exit).toHaveBeenCalledWith(0);
  });

  it("still exits when closing the pool throws", async () => {
    // A failed drain must not leave the host waiting out its whole grace period.
    const d = deps({
      closePool: vi.fn().mockRejectedValue(new Error("pool already ended")),
    });

    await createShutdownHandler(d)("SIGTERM");

    expect(d.exit).toHaveBeenCalledWith(0);
  });

  it("does not wait past the drain deadline for a hung request", async () => {
    vi.useFakeTimers();
    // A render turn holds its SSE stream for minutes and cannot finish inside
    // any host's grace period. The drain must give up rather than hang.
    const d = deps({
      stopServer: vi.fn().mockReturnValue(new Promise(() => 0)),
    });

    const done = createShutdownHandler(d)("SIGTERM");
    await vi.advanceTimersByTimeAsync(DRAIN_TIMEOUT_SEC * 1000);
    await done;

    expect(d.closePool).toHaveBeenCalledOnce();
    expect(d.exit).toHaveBeenCalledWith(0);
  });
});
