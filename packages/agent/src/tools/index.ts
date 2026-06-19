/** The agent's tool registry.
 *
 * The interactive tools below have NO `execute`: when the agent calls one, the
 * loop pauses and the call is streamed to the web, which renders custom UI and
 * sends the user's answer back as the tool output (human-in-the-loop). Search
 * and render tools (with server `execute`) land here as we iterate. */

import { AskUserQuestionInputSchema, VideoPlanSchema } from "@animus/core";
import { type ToolSet, tool } from "ai";

export const tools = {
  askUserQuestion: tool({
    description:
      "Ask the user a question with selectable options before continuing. Use this to get a decision or resolve ambiguity. The user picks one or more options and may also type a free-form answer. Prefer this over guessing.",
    inputSchema: AskUserQuestionInputSchema,
  }),
  finalizeVideoPlan: tool({
    description:
      "Propose a detailed video plan — an ordered list of scenes, each with a title and description — for the user to approve or send back with feedback. Call this once you and the user have converged on what the video should cover, before any production work.",
    inputSchema: VideoPlanSchema,
  }),
} satisfies ToolSet;
