import { WebSearchInputSchema } from "@animus/core/tools";
import type { ContentsOptions, RegularSearchOptions } from "exa-js";
import { describe, expect, it, vi } from "vitest";
import { type ExaClient, fetchWeb, searchWeb } from "../tools/exa.ts";
import { createTools } from "../tools/index.ts";

function createFakeClient(): {
  client: ExaClient;
  fetchCalls: Array<{ options?: ContentsOptions; urls: string | string[] }>;
  searchCalls: Array<{ options: RegularSearchOptions; query: string }>;
} {
  const searchCalls: Array<{ options: RegularSearchOptions; query: string }> =
    [];
  const fetchCalls: Array<{
    options?: ContentsOptions;
    urls: string | string[];
  }> = [];

  const client = {
    getContents: vi.fn((urls: string | string[], options?: ContentsOptions) => {
      fetchCalls.push({ options, urls });
      return Promise.resolve({
        requestId: "fetch-request",
        results: [
          {
            id: "result-2",
            title: null,
            url: "https://example.com/page",
            text: "Fetched page text",
            highlights: ["Important passage"],
          },
        ],
      });
    }),
    search: vi.fn((query: string, options: RegularSearchOptions) => {
      searchCalls.push({ options, query });
      return Promise.resolve({
        requestId: "search-request",
        results: [
          {
            id: "result-1",
            title: "A useful source",
            url: "https://example.com/source",
            publishedDate: "2026-01-01",
            author: "Example Author",
            score: 0.92,
            text: "Search result text",
            highlights: ["Relevant highlighted passage"],
            summary: "Short summary",
          },
        ],
      });
    }),
  } as unknown as ExaClient;

  return { client, fetchCalls, searchCalls };
}

describe("Exa web tools", () => {
  it("builds a web search request and normalizes results", async () => {
    const { client, searchCalls } = createFakeClient();

    const output = await searchWeb(client, {
      query: "Exa search API",
    });

    expect(searchCalls).toEqual([
      {
        options: {
          contents: { highlights: true },
          numResults: 10,
          type: "auto",
        },
        query: "Exa search API",
      },
    ]);
    expect(output).toEqual({
      query: "Exa search API",
      requestId: "search-request",
      results: [
        {
          author: "Example Author",
          highlights: ["Relevant highlighted passage"],
          publishedDate: "2026-01-01",
          score: 0.92,
          summary: "Short summary",
          text: "Search result text",
          title: "A useful source",
          url: "https://example.com/source",
        },
      ],
    });
  });

  it("fetches known URLs and falls back to URL as title", async () => {
    const { client, fetchCalls } = createFakeClient();

    const output = await fetchWeb(client, {
      urls: ["https://example.com/page"],
    });

    expect(fetchCalls).toEqual([
      {
        options: {
          text: { maxCharacters: 20_000, verbosity: "compact" },
        },
        urls: ["https://example.com/page"],
      },
    ]);
    expect(output.results[0]).toEqual({
      highlights: ["Important passage"],
      text: "Fetched page text",
      title: "https://example.com/page",
      url: "https://example.com/page",
    });
  });

  it("rejects model-controlled search options", () => {
    const result = WebSearchInputSchema.safeParse({
      includeDomains: ["docs.exa.ai"],
      query: "test",
    });

    expect(result.success).toBe(false);
  });

  it("registers executable web tools", async () => {
    const { client } = createFakeClient();
    const registry = createTools({ getExaClient: () => client });
    const webSearch = registry.webSearch;
    const webFetch = registry.webFetch;

    expect(webSearch?.execute).toBeTypeOf("function");
    expect(webFetch?.execute).toBeTypeOf("function");
    if (!webSearch?.execute) {
      throw new Error("webSearch tool is not executable");
    }

    const output = await webSearch.execute(
      {
        query: "Manim animations",
      },
      { messages: [], toolCallId: "call-1" }
    );

    expect(output.requestId).toBe("search-request");
  });
});
