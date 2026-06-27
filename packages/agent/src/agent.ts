/** The animus agent: a tool-calling loop over the Manim toolset. Built on the AI
 * SDK's ToolLoopAgent so the loop, retries, and tool orchestration are handled
 * for us. The toolset is built per turn: human-in-the-loop + web research
 * always, plus the Manim sandbox tools bound to this conversation's sandbox. */

import type { Sandbox } from "@daytonaio/sdk";
import { ToolLoopAgent, type ToolSet } from "ai";
import { getModel } from "./config/index.ts";
import { MANIM_SYSTEM_PROMPT } from "./prompts/index.ts";
import { createTools } from "./tools/index.ts";
import type { BackgroundMusicUrl, SaveVideo } from "./tools/manim.ts";

export function createManimAgent(deps: {
  sandbox: Sandbox;
  conversationId: string;
  saveVideo: SaveVideo;
  backgroundMusicUrl: BackgroundMusicUrl;
}): ToolLoopAgent<never, ToolSet, never> {
  return new ToolLoopAgent({
    model: getModel(),
    instructions: MANIM_SYSTEM_PROMPT,
    tools: createTools({ manim: deps }),
  });
}
