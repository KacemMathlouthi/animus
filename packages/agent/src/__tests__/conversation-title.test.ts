import { generateText } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateConversationTitle } from "../utils/conversation-title.ts";

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, generateText: vi.fn() };
});

vi.mock("../config/index.ts", () => ({
  getModel: vi.fn(() => "model-sentinel"),
}));

const mockedGenerateText = vi.mocked(generateText);

/** Drive generateConversationTitle by stubbing the model's structured output to
 * the given title, exercising the public function's cleanTitle behaviour. */
function withTitle(title: string): Promise<string> {
  mockedGenerateText.mockResolvedValue({
    output: { title },
  } as unknown as Awaited<ReturnType<typeof generateText>>);
  return generateConversationTitle({
    firstPrompt: "explain something",
    assistantSummary: "a summary",
  });
}

beforeEach(() => {
  mockedGenerateText.mockReset();
});

describe("generateConversationTitle", () => {
  it("returns a clean topic title unchanged", async () => {
    expect(await withTitle("Fourier Transform Visualized")).toBe(
      "Fourier Transform Visualized"
    );
  });

  it("strips generic words (conversation, chat, request)", async () => {
    expect(await withTitle("Fourier Transform conversation")).toBe(
      "Fourier Transform"
    );
    expect(await withTitle("Sorting chat request")).toBe("Sorting");
  });

  it('strips the generic "New Manim Explainer Video Chat" phrase', async () => {
    expect(await withTitle("New Manim Explainer Video Chat")).toBe(
      "Untitled video"
    );
  });

  it("strips surrounding quotes", async () => {
    expect(await withTitle('"Binary Search Trees"')).toBe(
      "Binary Search Trees"
    );
  });

  it("collapses internal whitespace and newlines", async () => {
    expect(await withTitle("Gradient   Descent\nStep By Step")).toBe(
      "Gradient Descent Step By Step"
    );
  });

  it("falls back to a default when the cleaned title is empty", async () => {
    expect(await withTitle("")).toBe("Untitled video");
    expect(await withTitle("   ")).toBe("Untitled video");
    expect(await withTitle("conversation chat request")).toBe("Untitled video");
  });

  it("truncates an overlong title to 120 chars with an ellipsis", async () => {
    const result = await withTitle("a".repeat(200));

    expect(result.length).toBe(120);
    expect(result.endsWith("...")).toBe(true);
  });

  it("forwards telemetry settings to generateText", async () => {
    mockedGenerateText.mockResolvedValue({
      output: { title: "Anything" },
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    await generateConversationTitle({
      firstPrompt: "explain something",
      telemetry: {
        isEnabled: true,
        functionId: "conversation-title",
        metadata: { conversationId: "conv-1" },
      },
    });

    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        experimental_telemetry: expect.objectContaining({
          functionId: "conversation-title",
          isEnabled: true,
        }),
      })
    );
  });
});
