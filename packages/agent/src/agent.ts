/** A ToolLoopAgent over the Manim toolset, built per turn: HITL and web
 * research always, plus sandbox tools bound to this conversation. */

import type { Sandbox } from "@daytonaio/sdk";
import {
  type TelemetrySettings,
  ToolLoopAgent,
  type ToolLoopAgentOnStepFinishCallback,
  type ToolSet,
} from "ai";
import { type LlmKey, resolveModel } from "./config/index.ts";
import { buildManimSystemPrompt } from "./prompts/index.ts";
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
  elevenLabsApiKey: string;
  voiceId: string;
  backgroundMusic: boolean;
  musicTrackId: string;
  meter: TurnMeter;
  /** Present means the turn runs unmetered on the user's own key. */
  llmKey?: LlmKey;
  /** Omitted means no tracing; apps/api owns the policy. */
  telemetry?: TelemetrySettings;
  /** Used to accumulate usage as it happens: `totalUsage` is empty on an
   * aborted stream, and cut turns are the expensive ones. */
  onStepFinish?: ToolLoopAgentOnStepFinishCallback<ToolSet>;
}): ToolLoopAgent<never, ToolSet, never> {
  return new ToolLoopAgent({
    model: resolveModel(deps.llmKey).model,
    // Bedrock 429s fresh accounts a few calls into a turn, and the default 2
    // retries gives up mid-loop. Six rides out the rate window.
    maxRetries: 6,
    instructions: buildManimSystemPrompt({ voiceId: deps.voiceId }),
    tools: createTools({
      manim: {
        sandbox: deps.sandbox,
        conversationId: deps.conversationId,
        saveVideo: deps.saveVideo,
        backgroundMusicUrl: deps.backgroundMusicUrl,
        backgroundMusic: deps.backgroundMusic,
        musicTrackId: deps.musicTrackId,
        elevenLabsApiKey: deps.elevenLabsApiKey,
        meter: deps.meter,
      },
    }),
    onStepFinish: deps.onStepFinish,
    experimental_telemetry: deps.telemetry,
  });
}
