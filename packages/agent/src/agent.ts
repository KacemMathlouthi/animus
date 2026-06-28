/** The animus agent: a tool-calling loop over the Manim toolset. Built on the AI
 * SDK's ToolLoopAgent so the loop, retries, and tool orchestration are handled
 * for us. The toolset is built per turn: human-in-the-loop + web research
 * always, plus the Manim sandbox tools bound to this conversation's sandbox. */

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
  /** Observability settings for this turn. The caller (apps/api) owns the
   * policy and per-turn metadata; omitted/disabled means no tracing. */
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
