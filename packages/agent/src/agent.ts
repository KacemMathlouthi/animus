/** The animus agent: a ToolLoopAgent over the Manim toolset (loop, retries, and
 * orchestration handled by the SDK). Toolset is built per turn — HITL + web
 * research always, plus the Manim sandbox tools bound to this conversation. */

import type { Sandbox } from "@daytonaio/sdk";
import { type TelemetrySettings, ToolLoopAgent, type ToolSet } from "ai";
import { getModel } from "./config/index.ts";
import { MANIM_SYSTEM_PROMPT } from "./prompts/index.ts";
import { createTools } from "./tools/index.ts";
import type { BackgroundMusicUrl, SaveVideo } from "./tools/manim.ts";

export function createManimAgent(deps: {
  sandbox: Sandbox;
  conversationId: string;
  saveVideo: SaveVideo;
  backgroundMusicUrl: BackgroundMusicUrl;
  /** Per-turn observability; the caller (apps/api) owns policy. Omitted means no tracing. */
  telemetry?: TelemetrySettings;
}): ToolLoopAgent<never, ToolSet, never> {
  return new ToolLoopAgent({
    model: getModel(),
    instructions: MANIM_SYSTEM_PROMPT,
    tools: createTools({
      manim: {
        sandbox: deps.sandbox,
        conversationId: deps.conversationId,
        saveVideo: deps.saveVideo,
        backgroundMusicUrl: deps.backgroundMusicUrl,
      },
    }),
    experimental_telemetry: deps.telemetry,
  });
}
