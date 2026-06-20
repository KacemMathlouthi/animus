import { describe, expect, it } from "vitest";
import {
  AskUserQuestionInputSchema,
  AskUserQuestionOutputSchema,
} from "../hitl.ts";

describe("AskUserQuestionInputSchema", () => {
  it("accepts unique option labels", () => {
    const result = AskUserQuestionInputSchema.safeParse({
      question: "Pick a direction",
      options: [{ label: "Left" }, { label: "Right" }],
    });

    expect(result.success).toBe(true);
  });

  it("rejects duplicate option labels", () => {
    const result = AskUserQuestionInputSchema.safeParse({
      question: "Pick a direction",
      options: [
        { label: "Continue", description: "Use the current plan" },
        { label: "Continue", description: "Continue with changes" },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe("AskUserQuestionOutputSchema", () => {
  it("accepts multiple selected labels for multi-select questions", () => {
    const result = AskUserQuestionOutputSchema.safeParse({
      selected: ["Visual intuition", "Formal proof"],
    });

    expect(result.success).toBe(true);
  });
});
