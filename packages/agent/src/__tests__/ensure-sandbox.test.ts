import {
  DaytonaConnectionError,
  DaytonaNotFoundError,
  type Sandbox,
} from "@daytonaio/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, start, create } = vi.hoisted(() => ({
  get: vi.fn(),
  start: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@daytonaio/sdk", async () => {
  const actual =
    await vi.importActual<Record<string, unknown>>("@daytonaio/sdk");
  return {
    ...actual,
    Daytona: vi.fn(() => ({ get, create })),
  };
});

vi.mock("@animus/core/env", () => ({
  getServerEnv: () => ({ daytonaApiKey: "key", daytonaTarget: undefined }),
}));

const ARGS = {
  conversationId: "conv-1",
  elevenLabsApiKey: "el-key",
  sandboxId: "sandbox-old",
};

async function loadEnsureSandbox() {
  // The module caches its Daytona client, so each case needs a fresh module.
  vi.resetModules();
  const mod = await import("../sandbox/index.ts");
  return mod.ensureSandbox;
}

describe("ensureSandbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({ id: "sandbox-new" } as Sandbox);
  });

  it("resumes a stopped sandbox instead of creating a new one", async () => {
    get.mockResolvedValue({ id: "sandbox-old", state: "stopped", start });
    const ensureSandbox = await loadEnsureSandbox();

    const sandbox = await ensureSandbox(ARGS);

    expect(start).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
    expect(sandbox.id).toBe("sandbox-old");
  });

  it("creates a fresh sandbox when the old one is genuinely gone", async () => {
    get.mockRejectedValue(new DaytonaNotFoundError("no such sandbox"));
    const ensureSandbox = await loadEnsureSandbox();

    const sandbox = await ensureSandbox(ARGS);

    expect(sandbox.id).toBe("sandbox-new");
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("propagates a transient failure rather than replacing the sandbox", async () => {
    // Creating a replacement would orphan the old sandbox — nothing but
    // conversation delete reclaims one — and lose the conversation's files.
    get.mockRejectedValue(new DaytonaConnectionError("host unreachable"));
    const ensureSandbox = await loadEnsureSandbox();

    await expect(ensureSandbox(ARGS)).rejects.toBeInstanceOf(
      DaytonaConnectionError
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("propagates a failure to start an existing sandbox", async () => {
    start.mockRejectedValueOnce(new DaytonaConnectionError("start failed"));
    get.mockResolvedValue({ id: "sandbox-old", state: "stopped", start });
    const ensureSandbox = await loadEnsureSandbox();

    await expect(ensureSandbox(ARGS)).rejects.toBeInstanceOf(
      DaytonaConnectionError
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("archives well before the SDK's 7-day default so disk is reclaimed", async () => {
    const ensureSandbox = await loadEnsureSandbox();

    await ensureSandbox({ ...ARGS, sandboxId: null });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        autoArchiveInterval: 60,
        autoStopInterval: 30,
      }),
      expect.anything()
    );
  });
});
