import type { Sandbox } from "@daytonaio/sdk";
import type { TelemetrySettings, ToolSet } from "ai";
import { describe, expect, it, vi } from "vitest";

/** Capture what createManimAgent passes to ToolLoopAgent so we can assert the
 * wiring (model + toolset + telemetry) without standing up a real model or
 * sandbox. */
const captured = vi.hoisted(() => ({
  config: undefined as
    | {
        model: unknown;
        instructions: string;
        tools: ToolSet;
        experimental_telemetry?: TelemetrySettings;
      }
    | undefined,
}));

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  class FakeToolLoopAgent {
    constructor(config: {
      model: unknown;
      instructions: string;
      tools: ToolSet;
      experimental_telemetry?: TelemetrySettings;
    }) {
      captured.config = config;
    }
  }
  return { ...actual, ToolLoopAgent: FakeToolLoopAgent };
});

vi.mock("../config/index.ts", () => ({
  getModel: vi.fn(() => "model-sentinel"),
}));

const { createManimAgent } = await import("../agent.ts");

function build(telemetry?: TelemetrySettings): void {
  createManimAgent({
    sandbox: {} as unknown as Sandbox,
    conversationId: "conv-1",
    saveVideo: vi.fn(() => Promise.resolve("videos/conv/x.mp4")),
    backgroundMusicUrl: vi.fn(() => Promise.resolve("https://music.test")),
    telemetry,
  });
}

describe("createManimAgent", () => {
  it("builds the agent with the resolved model and system instructions", () => {
    build();

    expect(captured.config?.model).toBe("model-sentinel");
    expect(typeof captured.config?.instructions).toBe("string");
    expect(captured.config?.instructions.length).toBeGreaterThan(0);
  });

  it("wires the manim sandbox tools alongside the HITL and research tools", () => {
    build();

    const toolNames = Object.keys(captured.config?.tools ?? {});
    // Human-in-the-loop + web research tools are always present.
    expect(toolNames).toEqual(
      expect.arrayContaining([
        "askUserQuestion",
        "finalizeVideoPlan",
        "webFetch",
        "webSearch",
      ])
    );
    // Manim sandbox tools are bound because a sandbox was provided.
    expect(toolNames).toEqual(
      expect.arrayContaining(["editFile", "runCommand", "renderScene"])
    );
  });

  it("forwards the caller's telemetry settings to the agent", () => {
    const telemetry: TelemetrySettings = {
      isEnabled: true,
      functionId: "manim-agent",
      metadata: { conversationId: "conv-1", userId: "user-1" },
    };
    build(telemetry);

    expect(captured.config?.experimental_telemetry).toEqual(telemetry);
  });

  it("leaves telemetry undefined when the caller passes none", () => {
    build();

    expect(captured.config?.experimental_telemetry).toBeUndefined();
  });
});
