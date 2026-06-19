/** The animus agent: a tool-calling loop over the Manim toolset. Built on the AI
 * SDK's ToolLoopAgent so the loop, retries, and tool orchestration are handled
 * for us. Today the toolset is empty (chat only); the same agent gains the
 * sandbox/render tools as we iterate. */

import { ToolLoopAgent } from "ai";
import { getModel } from "./config/index.ts";
import { MANIM_SYSTEM_PROMPT } from "./prompts/index.ts";
import { tools } from "./tools/index.ts";

export function createManimAgent(): ToolLoopAgent<never, typeof tools, never> {
  return new ToolLoopAgent({
    model: getModel(),
    instructions: MANIM_SYSTEM_PROMPT,
    tools,
  });
}
