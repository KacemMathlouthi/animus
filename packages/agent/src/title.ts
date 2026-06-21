import { generateText } from "ai";
import { getModel } from "./config/index.ts";

const MAX_TITLE_LENGTH = 80;

function cleanTitle(text: string): string {
  const singleLine = text
    .replaceAll("\n", " ")
    .replace(/^["']+|["']+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (singleLine.length <= MAX_TITLE_LENGTH) {
    return singleLine || "Untitled video";
  }

  return `${singleLine.slice(0, MAX_TITLE_LENGTH - 3).trim()}...`;
}

export async function generateConversationTitle({
  firstPrompt,
  assistantSummary,
  abortSignal,
}: {
  firstPrompt: string;
  assistantSummary?: string;
  abortSignal?: AbortSignal;
}): Promise<string> {
  const result = await generateText({
    abortSignal,
    model: getModel(),
    prompt: [
      "Create a concise conversation title for a Manim explainer video chat.",
      "Return only the title. No quotes. No punctuation unless needed.",
      "Keep it under 8 words.",
      "",
      `User prompt: ${firstPrompt}`,
      assistantSummary ? `Assistant response: ${assistantSummary}` : "",
    ].join("\n"),
  });

  return cleanTitle(result.text);
}
