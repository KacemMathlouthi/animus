import { describe, expect, it } from "vitest";
import { WebFetchInputSchema, WebSearchInputSchema } from "../exa.ts";

describe("WebSearchInputSchema", () => {
  it("accepts only a search query", () => {
    const result = WebSearchInputSchema.parse({ query: "Manim" });
    expect(result).toEqual({ query: "Manim" });
  });

  it("rejects model-controlled search options", () => {
    const result = WebSearchInputSchema.safeParse({
      query: "Manim",
      includeDomains: ["docs.manim.community"],
      numResults: 3,
      type: "neural",
    });

    expect(result.success).toBe(false);
  });
});

describe("WebFetchInputSchema", () => {
  it("accepts only up to five urls", () => {
    const result = WebFetchInputSchema.safeParse({
      urls: ["https://docs.manim.community"],
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid urls", () => {
    const result = WebFetchInputSchema.safeParse({
      urls: ["not-a-url"],
    });

    expect(result.success).toBe(false);
  });

  it("rejects model-controlled fetch options", () => {
    const result = WebFetchInputSchema.safeParse({
      urls: ["https://docs.manim.community"],
      maxCharacters: 1000,
    });

    expect(result.success).toBe(false);
  });
});
