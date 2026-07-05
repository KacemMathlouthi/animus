/** Contracts for BYO provider keys. A user can hold at most one LLM key (with a
 * curated model) and one TTS key (ElevenLabs), discriminated by `kind`. The
 * input schemas validate what the client sends to save a key; the preview is all
 * the API ever sends back — the plaintext key never leaves the server. */

import { z } from "zod";
import {
  isValidModelForProvider,
  type ProviderId,
  ProviderIdSchema,
  TTS_PROVIDER_ID,
  type TtsProviderId,
} from "./providers.ts";

export const KEY_KINDS = ["llm", "tts"] as const;
export const KeyKindSchema = z.enum(KEY_KINDS);
export type KeyKind = (typeof KEY_KINDS)[number];

// Trim first so whitespace-only keys are rejected, and require a real length so
// the stored `last4` preview can never reveal a whole (too-short) key.
const KeyStringSchema = z.string().trim().min(8).max(512);

export const LlmKeyInputSchema = z.object({
  kind: z.literal("llm"),
  provider: ProviderIdSchema,
  model: z.string().min(1).max(128),
  key: KeyStringSchema,
});

export const TtsKeyInputSchema = z.object({
  kind: z.literal("tts"),
  key: KeyStringSchema,
});

/** What the client sends to `PUT /api/settings/keys`. The `model` on an LLM key
 * must be one of the curated models for its provider (checked in `superRefine`
 * because `discriminatedUnion` cannot carry per-branch effects). */
export const ProviderKeyInputSchema = z
  .discriminatedUnion("kind", [LlmKeyInputSchema, TtsKeyInputSchema])
  .superRefine((value, ctx) => {
    if (
      value.kind === "llm" &&
      !isValidModelForProvider(value.provider, value.model)
    ) {
      ctx.addIssue({
        code: "custom",
        message: `Unknown model "${value.model}" for provider "${value.provider}".`,
        path: ["model"],
      });
    }
  });
export type ProviderKeyInput = z.infer<typeof ProviderKeyInputSchema>;
export type LlmKeyInput = z.infer<typeof LlmKeyInputSchema>;
export type TtsKeyInput = z.infer<typeof TtsKeyInputSchema>;

/** Masked LLM key returned to the client — provider, model, and last 4 chars. */
export interface LlmKeyPreview {
  kind: "llm";
  last4: string;
  model: string;
  provider: ProviderId;
}

/** Masked TTS key returned to the client — ElevenLabs plus the last 4 chars. */
export interface TtsKeyPreview {
  kind: "tts";
  last4: string;
  provider: TtsProviderId;
}

export type ProviderKeyPreview = LlmKeyPreview | TtsKeyPreview;

/** Both of a user's key previews, either possibly absent. The shape returned by
 * `GET /api/settings/keys`. */
export interface ProviderKeys {
  llm: LlmKeyPreview | null;
  tts: TtsKeyPreview | null;
}

/** The provider id stored for a TTS key row (there is only one). */
export const TTS_KEY_PROVIDER = TTS_PROVIDER_ID;
