import { describe, expect, it } from "vitest";
import { WebFetchInputSchema, WebSearchInputSchema } from "../exa.ts";

describe("WebSearchInputSchema", () => {
  it("accepts a valid search query", () => {
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
  it("accepts up to five http urls", () => {
    const result = WebFetchInputSchema.safeParse({
      urls: [
        "https://docs.manim.community",
        "http://example.com/one",
        "https://example.com/two",
        "https://example.com/three",
        "https://example.com/four",
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects more than five urls", () => {
    const result = WebFetchInputSchema.safeParse({
      urls: [
        "https://example.com/one",
        "https://example.com/two",
        "https://example.com/three",
        "https://example.com/four",
        "https://example.com/five",
        "https://example.com/six",
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid urls", () => {
    const result = WebFetchInputSchema.safeParse({
      urls: ["not-a-url"],
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-http urls", () => {
    const result = WebFetchInputSchema.safeParse({
      urls: [
        "javascript:alert(1)",
        "file:///etc/passwd",
        "mailto:test@example.com",
      ],
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
