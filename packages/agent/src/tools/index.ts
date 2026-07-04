/** The agent's tool registry.
 *
 * Interactive (HITL) tools have NO `execute`: the loop pauses and the call is
 * streamed to the web, which renders UI and sends the user's answer back as the
 * tool output. Web research tools execute server-side through Exa. Manim tools
 * act on the conversation's sandbox, and are present only when one is provided. */

import {
  AskUserQuestionInputSchema,
  VideoPlanSchema,
  WebFetchInputSchema,
  type WebFetchOutput,
  WebSearchInputSchema,
  type WebSearchOutput,
} from "@animus/core/tools";
import type { Sandbox } from "@daytonaio/sdk";
import { type ToolSet, tool } from "ai";
import { type ExaClient, fetchWeb, getExaClient, searchWeb } from "./exa.ts";
import {
  type BackgroundMusicUrl,
  createManimTools,
  type SaveVideo,
} from "./manim.ts";

interface ToolDependencies {
  getExaClient?: () => ExaClient;
  /** When present, the agent gets the Manim sandbox tools bound to this turn. */
  manim?: {
    sandbox: Sandbox;
    conversationId: string;
    saveVideo: SaveVideo;
    backgroundMusicUrl: BackgroundMusicUrl;
  };
}

export function createTools(dependencies: ToolDependencies = {}): ToolSet {
  const resolveExaClient = dependencies.getExaClient ?? getExaClient;

  return {
    ...(dependencies.manim ? createManimTools(dependencies.manim) : {}),
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
