/** The agent's tool registry.
 *
 * Interactive tools have NO `execute`: when the agent calls one, the loop
 * pauses and the call is streamed to the web, which renders custom UI and sends
 * the user's answer back as the tool output (human-in-the-loop). Web research
 * tools execute on the server through Exa. Render tools land here next. */

import {
  AskUserQuestionInputSchema,
  VideoPlanSchema,
  WebFetchInputSchema,
  type WebFetchOutput,
  WebSearchInputSchema,
  type WebSearchOutput,
} from "@animus/core/tools";
import { type ToolSet, tool } from "ai";
import { type ExaClient, fetchWeb, getExaClient, searchWeb } from "./exa.ts";

interface ToolDependencies {
  getExaClient?: () => ExaClient;
}

export function createTools(dependencies: ToolDependencies = {}): ToolSet {
  const resolveExaClient = dependencies.getExaClient ?? getExaClient;

  return {
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
    webFetch: tool({
      description:
        "Fetch readable text from one or more known webpage URLs. Only provide URLs; retrieval settings are fixed by animus. Use this after webSearch when you need deeper source material from specific pages.",
      inputSchema: WebFetchInputSchema,
      execute: async (input): Promise<WebFetchOutput> =>
        fetchWeb(resolveExaClient(), input),
    }),
    webSearch: tool({
      description:
        "Search the web for current or source-grounded information using Exa. Only provide the search query; search settings are fixed by animus. Returns URLs, titles, and highlights for research before planning a video.",
      inputSchema: WebSearchInputSchema,
      execute: async (input): Promise<WebSearchOutput> =>
        searchWeb(resolveExaClient(), input),
    }),
  } satisfies ToolSet;
}

export const tools = createTools();
