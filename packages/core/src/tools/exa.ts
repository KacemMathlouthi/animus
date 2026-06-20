import { z } from "zod";

/** webSearch — search the web through Exa for grounded source material. */
export const WebSearchInputSchema = z
  .object({
    query: z.string().min(1),
  })
  .strict();
export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

/** webFetch — fetch readable content from known URLs through Exa. */
export const WebFetchInputSchema = z
  .object({
    urls: z.array(z.httpUrl()).min(1).max(5),
  })
  .strict();
export type WebFetchInput = z.infer<typeof WebFetchInputSchema>;

export interface WebResult {
  author?: string;
  favicon?: string;
  highlights?: string[];
  publishedDate?: string;
  score?: number;
  summary?: string;
  text?: string;
  title: string;
  url: string;
}

export interface WebSearchOutput {
  query: string;
  requestId: string;
  results: WebResult[];
}

export interface WebFetchOutput {
  requestId: string;
  results: WebResult[];
}
