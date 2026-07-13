/** The animus agent: a ToolLoopAgent over the Manim toolset (loop, retries, and
 * orchestration handled by the SDK). Toolset is built per turn — HITL + web
 * research always, plus the Manim sandbox tools bound to this conversation. */

import type { Sandbox } from "@daytonaio/sdk";
import { type TelemetrySettings, ToolLoopAgent, type ToolSet } from "ai";
import { type LlmKey, resolveModel } from "./config/index.ts";
import { MANIM_SYSTEM_PROMPT } from "./prompts/index.ts";
import { createTools } from "./tools/index.ts";
import type {
  BackgroundMusicUrl,
  SaveVideo,
  TurnMeter,
} from "./tools/manim.ts";

export function createManimAgent(deps: {
  sandbox: Sandbox;
  conversationId: string;
  saveVideo: SaveVideo;
  backgroundMusicUrl: BackgroundMusicUrl;
  /** The effective ElevenLabs key for this turn (the user's own, or ours). */
  elevenLabsApiKey: string;
  /** Per-turn TTS accumulator the caller reads after the turn to meter cost. */
  meter: TurnMeter;
  /** When present, the turn runs on the user's own LLM key (not metered);
   * otherwise it runs on our Bedrock model (metered). */
  llmKey?: LlmKey;
  /** Per-turn observability; the caller (apps/api) owns policy. Omitted means no tracing. */
  telemetry?: TelemetrySettings;
}): ToolLoopAgent<never, ToolSet, never> {
  return new ToolLoopAgent({
    model: resolveModel(deps.llmKey).model,
    instructions: MANIM_SYSTEM_PROMPT,
    tools: createTools({
      manim: {
        sandbox: deps.sandbox,
        conversationId: deps.conversationId,
        saveVideo: deps.saveVideo,
        backgroundMusicUrl: deps.backgroundMusicUrl,
        elevenLabsApiKey: deps.elevenLabsApiKey,
        meter: deps.meter,
      },
    }),
    experimental_telemetry: deps.telemetry,
  });
}
