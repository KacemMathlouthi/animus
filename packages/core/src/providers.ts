/** The providers a user can bring a key for. The web adds brand icons, the API
 * validates against these ids, the agent maps them to SDK clients. Add a
 * provider or model here and nowhere else. */

import { z } from "zod";

export const PROVIDER_IDS = ["anthropic", "openai", "google"] as const;

export const ProviderIdSchema = z.enum(PROVIDER_IDS);
export type ProviderId = (typeof PROVIDER_IDS)[number];

export interface ModelOption {
  id: string;
  name: string;
}

export interface ProviderInfo {
  docsUrl: string;
  envKey: string;
  id: ProviderId;
  models: readonly ModelOption[];
  name: string;
  placeholder: string;
}

export const PROVIDERS: readonly ProviderInfo[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    placeholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
    models: [
      { id: "claude-opus-4-8", name: "Claude Opus 4.8" },
      { id: "claude-opus-4-7", name: "Claude Opus 4.7" },
      { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
      { id: "claude-sonnet-5", name: "Claude Sonnet 5" },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    envKey: "OPENAI_API_KEY",
    placeholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
    models: [
      { id: "gpt-5.5", name: "GPT-5.5" },
      { id: "gpt-5.4-pro", name: "GPT-5.4 Pro" },
      { id: "gpt-5.4", name: "GPT-5.4" },
      { id: "gpt-5.4-mini", name: "GPT-5.4 Mini" },
    ],
  },
  {
    id: "google",
    name: "Google Gemini",
    envKey: "GEMINI_API_KEY",
    placeholder: "AIza...",
    docsUrl: "https://aistudio.google.com/app/apikey",
    models: [
      { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash" },
      { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite" },
      { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview" },
    ],
  },
];

/** The list both the key schema and the model resolver validate against. */
export const LLM_MODELS: Record<ProviderId, readonly ModelOption[]> =
  Object.fromEntries(PROVIDERS.map((p) => [p.id, p.models])) as Record<
    ProviderId,
    readonly ModelOption[]
  >;

export function isValidModelForProvider(
  provider: ProviderId,
  model: string
): boolean {
  return LLM_MODELS[provider].some((m) => m.id === model);
}

/** Outside `PROVIDER_IDS`, which the agent maps to LLM SDK clients. Stored in
 * the same table under `kind: "tts"`. */
export const TTS_PROVIDER_ID = "elevenlabs" as const;
export type TtsProviderId = typeof TTS_PROVIDER_ID;

export interface TtsProviderInfo {
  docsUrl: string;
  envKey: string;
  id: TtsProviderId;
  name: string;
  placeholder: string;
}

export const TTS_PROVIDER: TtsProviderInfo = {
  id: TTS_PROVIDER_ID,
  name: "ElevenLabs",
  envKey: "ELEVENLABS_API_KEY",
  placeholder: "sk_...",
  docsUrl: "https://elevenlabs.io/app/settings/api-keys",
};
