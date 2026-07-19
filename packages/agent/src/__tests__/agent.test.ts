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
        maxRetries?: number;
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
      maxRetries?: number;
      instructions: string;
      tools: ToolSet;
      experimental_telemetry?: TelemetrySettings;
    }) {
      captured.config = config;
    }
  }
  return { ...actual, ToolLoopAgent: FakeToolLoopAgent };
});

const { resolveModel } = vi.hoisted(() => ({
  resolveModel: vi.fn((llmKey?: { model: string }) => ({
    model: llmKey ? `byok:${llmKey.model}` : "model-sentinel",
    isLlmMetered: !llmKey,
    modelId: llmKey?.model ?? "bedrock-default",
  })),
}));

vi.mock("../config/index.ts", () => ({
  getModel: vi.fn(() => "model-sentinel"),
  resolveModel,
}));

const { createManimAgent } = await import("../agent.ts");

function build(
  telemetry?: TelemetrySettings,
  llmKey?: { provider: "anthropic"; model: string; apiKey: string }
): void {
  createManimAgent({
    sandbox: {} as unknown as Sandbox,
    conversationId: "conv-1",
    saveVideo: vi.fn(() => Promise.resolve("videos/conv/x.mp4")),
    backgroundMusicUrl: vi.fn(() => Promise.resolve("https://music.test")),
    elevenLabsApiKey: "el-test-key",
    meter: { ttsChars: 0 },
    telemetry,
    llmKey,
  });
}

describe("createManimAgent", () => {
  it("builds the agent with the resolved model and system instructions", () => {
    build();

    expect(captured.config?.model).toBe("model-sentinel");
    expect(typeof captured.config?.instructions).toBe("string");
    expect(captured.config?.instructions.length).toBeGreaterThan(0);
  });

  it("raises the retry budget so provider throttling waits instead of dying", () => {
    build();

    // Bedrock 429s on fresh-account quotas a few calls into a turn; the SDK
    // default of 2 retries abandons the loop mid-turn.
    expect(captured.config?.maxRetries).toBe(6);
  });

  it("runs on the user's BYOK model when an LLM key is provided", () => {
    build(undefined, {
      provider: "anthropic",
      model: "claude-opus-4-6",
      apiKey: "sk-ant-xxxx",
    });

    expect(resolveModel).toHaveBeenCalledWith({
      provider: "anthropic",
      model: "claude-opus-4-6",
      apiKey: "sk-ant-xxxx",
    });
    expect(captured.config?.model).toBe("byok:claude-opus-4-6");
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
