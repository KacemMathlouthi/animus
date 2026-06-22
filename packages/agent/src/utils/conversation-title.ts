import { GeneratedConversationTitleSchema } from "@animus/core";
import { generateText, Output } from "ai";
import { getModel } from "../config/index.ts";

const MAX_TITLE_LENGTH = 120;
const TITLE_MODEL = "us.anthropic.claude-haiku-4-5-20251001-v1:0";

const CONVERSATION_TITLE_PROMPT = [
  "Create a short title for a Manim explainer video conversation.",
  "The title must name the actual topic or concept from the user prompt.",
  "Do not use generic words like chat, conversation, request, video, explainer, or Manim unless they are the topic.",
  "Do not return titles like New Manim Explainer Video Chat.",
  "Keep it under 8 words and avoid terminal punctuation.",
].join("\n");

function cleanTitle(text: string): string {
  const singleLine = text
    .replaceAll("\n", " ")
    .replace(/^["']+|["']+$/g, "")
    .replace(/\b(new\s+)?(manim\s+)?explainer\s+video\s+chat\b/gi, "")
    .replace(/\b(conversation|chat|request)\b/gi, "")
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
    model: getModel(TITLE_MODEL),
    output: Output.object({
      schema: GeneratedConversationTitleSchema,
      name: "conversationTitle",
      description: "A concise, topic-specific title for a conversation.",
    }),
    prompt: [
      CONVERSATION_TITLE_PROMPT,
      "",
      `User prompt: ${firstPrompt}`,
      assistantSummary ? `Assistant response: ${assistantSummary}` : "",
    ].join("\n"),
  });

  return cleanTitle(result.output.title);
}
