/** AI providers a user can bring their own API key for. Logos come from
 * @lobehub/icons (a dedicated AI/LLM brand-icon package), so adding a provider
 * is a single entry — no hand-maintained SVGs, and it scales to dozens. */

import {
	Anthropic,
	Gemini,
	Grok,
	Groq,
	type IconType,
	Mistral,
	OpenAI,
} from "@lobehub/icons";

export interface Provider {
	id: string;
	name: string;
	icon: IconType;
	envKey: string;
	placeholder: string;
	docsUrl: string;
}

export const PROVIDERS: Provider[] = [
	{
		id: "openai",
		name: "OpenAI",
		icon: OpenAI,
		envKey: "OPENAI_API_KEY",
		placeholder: "sk-...",
		docsUrl: "https://platform.openai.com/api-keys",
	},
	{
		id: "anthropic",
		name: "Anthropic",
		icon: Anthropic,
		envKey: "ANTHROPIC_API_KEY",
		placeholder: "sk-ant-...",
		docsUrl: "https://console.anthropic.com/settings/keys",
	},
	{
		id: "google",
		name: "Google Gemini",
		icon: Gemini,
		envKey: "GEMINI_API_KEY",
		placeholder: "AIza...",
		docsUrl: "https://aistudio.google.com/app/apikey",
	},
	{
		id: "mistral",
		name: "Mistral",
		icon: Mistral,
		envKey: "MISTRAL_API_KEY",
		placeholder: "...",
		docsUrl: "https://console.mistral.ai/api-keys",
	},
	{
		id: "groq",
		name: "Groq",
		icon: Groq,
		envKey: "GROQ_API_KEY",
		placeholder: "gsk_...",
		docsUrl: "https://console.groq.com/keys",
	},
	{
		id: "xai",
		name: "xAI Grok",
		icon: Grok,
		envKey: "XAI_API_KEY",
		placeholder: "xai-...",
		docsUrl: "https://console.x.ai",
	},
];
