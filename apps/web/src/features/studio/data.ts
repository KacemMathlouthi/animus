/** Mock studio content. This is the seam — swap for real chat data later. */

import { nanoid } from "nanoid";
import type { StudioMessage } from "@/features/studio/types";

export function createUserMessage(text: string): StudioMessage {
	return { id: nanoid(), role: "user", text };
}

export function createAssistantMessage(prompt: string): StudioMessage {
	return {
		id: nanoid(),
		role: "assistant",
		reasoning:
			"Breaking the topic into scenes, choosing a visual metaphor for each, and outlining the narration so the idea builds step by step.",
		text: `Here's how I'd explain **${prompt}**:\n\n1. Open with the core question\n2. Build intuition with one concrete visual\n3. Reveal the underlying mechanism\n4. Recap it in a single sentence\n\nI'm rendering a first cut on the right — tell me what to change and I'll re-cut any scene.`,
		sources: [
			{ href: "https://en.wikipedia.org", title: "Wikipedia — topic overview" },
			{ href: "https://arxiv.org", title: "arXiv — primary research" },
		],
	};
}

export function createConversationMessages(prompt: string): StudioMessage[] {
	return [createUserMessage(prompt), createAssistantMessage(prompt)];
}

export const studioSuggestions = [
	"Explain how neural networks learn",
	"Visualize the Fourier transform",
	"Why is the sky blue?",
	"How GPS triangulation works",
	"What is the Monty Hall problem?",
	"How vaccines train immunity",
];
