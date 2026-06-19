/** The AI providers a user can bring their own key for — the shared, framework-
 * agnostic data (ids, env-var names, docs, input hint). The web decorates each
 * with a brand icon; the API validates keys against `PROVIDER_IDS`; the agent
 * maps the id to an SDK client. Add a provider in one place, here. */

import { z } from "zod";

export const PROVIDER_IDS = [
  "openai",
  "anthropic",
  "google",
  "mistral",
  "groq",
  "xai",
] as const;

export const ProviderIdSchema = z.enum(PROVIDER_IDS);
export type ProviderId = (typeof PROVIDER_IDS)[number];

export interface ProviderInfo {
  /** Where the user creates a key. */
  docsUrl: string;
  /** Conventional env-var name for this provider's key. */
  envKey: string;
  id: ProviderId;
  name: string;
  /** Placeholder shown in the key input. */
  placeholder: string;
}

export const PROVIDERS: readonly ProviderInfo[] = [
  {
    id: "openai",
    name: "OpenAI",
    envKey: "OPENAI_API_KEY",
    placeholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    placeholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "google",
    name: "Google Gemini",
    envKey: "GEMINI_API_KEY",
    placeholder: "AIza...",
    docsUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "mistral",
    name: "Mistral",
    envKey: "MISTRAL_API_KEY",
    placeholder: "...",
    docsUrl: "https://console.mistral.ai/api-keys",
  },
  {
    id: "groq",
    name: "Groq",
    envKey: "GROQ_API_KEY",
    placeholder: "gsk_...",
    docsUrl: "https://console.groq.com/keys",
  },
  {
    id: "xai",
    name: "xAI Grok",
    envKey: "XAI_API_KEY",
    placeholder: "xai-...",
    docsUrl: "https://console.x.ai",
  },
];
