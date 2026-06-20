import { getServerEnv } from "@animus/core/env";
import type {
  WebFetchInput,
  WebFetchOutput,
  WebResult,
  WebSearchInput,
  WebSearchOutput,
} from "@animus/core/tools";
import Exa, {
  type ContentsOptions,
  type RegularSearchOptions,
  type SearchResponse,
} from "exa-js";

export type ExaClient = Pick<Exa, "getContents" | "search">;

const WEB_SEARCH_OPTIONS = {
  contents: { highlights: true },
  numResults: 10,
  type: "auto",
} satisfies RegularSearchOptions;

const WEB_FETCH_CONTENTS_OPTIONS = {
  text: {
    maxCharacters: 20_000,
    verbosity: "compact",
  },
} satisfies ContentsOptions;

let cachedExaClient: Exa | null = null;

export function getExaClient(): Exa {
  const env = getServerEnv();
  if (!env.exaApiKey) {
    throw new Error("EXA_API_KEY is required to use web search tools");
  }

  cachedExaClient ??= new Exa(env.exaApiKey);
  return cachedExaClient;
}

export async function searchWeb(
  client: ExaClient,
  input: WebSearchInput
): Promise<WebSearchOutput> {
  const response = await client.search(input.query, WEB_SEARCH_OPTIONS);
  return {
    query: input.query,
    requestId: response.requestId,
    results: normalizeResults(response),
  };
}

export async function fetchWeb(
  client: ExaClient,
  input: WebFetchInput
): Promise<WebFetchOutput> {
  const response = await client.getContents(
    input.urls,
    WEB_FETCH_CONTENTS_OPTIONS
  );
  return {
    requestId: response.requestId,
    results: normalizeResults(response),
  };
}

function normalizeResults(
  response: SearchResponse<ContentsOptions>
): WebResult[] {
  return response.results.map((result) => {
    const record = result as Record<string, unknown>;
    return {
      title: result.title ?? result.url,
      url: result.url,
      publishedDate: result.publishedDate,
      author: result.author,
      score: result.score,
      text: readString(record, "text"),
      highlights: readStringArray(record, "highlights"),
      summary: readString(record, "summary"),
    };
  });
}

function readString(
  record: Record<string, unknown>,
  key: string
): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function readStringArray(
  record: Record<string, unknown>,
  key: string
): string[] | undefined {
  const value = record[key];
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : undefined;
}
