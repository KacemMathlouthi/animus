import { describe, expect, it, vi } from "vitest";

// telemetry.ts pulls in the logger (and, transitively, env). Stub both so the
// module loads without a full environment; these tests exercise the pure
// aiTelemetry mapping and the disabled-by-default state.
vi.mock("@animus/core/env", () => ({
  getServerEnv: () => ({ braintrustProject: "animus" }),
}));
vi.mock("../lib/logger.ts", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { aiTelemetry, isTelemetryEnabled } = await import(
  "../observability/telemetry.ts"
);

describe("aiTelemetry", () => {
  it("is disabled until telemetry is initialized", () => {
    expect(isTelemetryEnabled()).toBe(false);
  });

  it("reports isEnabled: false and forwards functionId + metadata when off", () => {
    const settings = aiTelemetry({
      functionId: "manim-agent",
      metadata: { conversationId: "conv-1", userId: "user-1" },
    });

    expect(settings).toEqual({
      isEnabled: false,
      functionId: "manim-agent",
      metadata: { conversationId: "conv-1", userId: "user-1" },
    });
  });

  it("allows metadata to be omitted", () => {
    const settings = aiTelemetry({ functionId: "conversation-title" });

    expect(settings.functionId).toBe("conversation-title");
    expect(settings.metadata).toBeUndefined();
    expect(settings.isEnabled).toBe(false);
  });
});
