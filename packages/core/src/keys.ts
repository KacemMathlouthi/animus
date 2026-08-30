/** BYO key contracts: at most one LLM key and one TTS key per user, by `kind`.
 * The preview is all the API ever returns; plaintext never leaves the server. */

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

// The length floor stops a `last4` preview revealing a whole short key.
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

/** `model` must be curated for its provider, checked in `superRefine` because
 * `discriminatedUnion` cannot carry per-branch effects. */
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

export interface LlmKeyPreview {
  kind: "llm";
  last4: string;
  model: string;
  provider: ProviderId;
}

export interface TtsKeyPreview {
  kind: "tts";
  last4: string;
  provider: TtsProviderId;
}

export type ProviderKeyPreview = LlmKeyPreview | TtsKeyPreview;

/** The shape returned by `GET /api/settings/keys`. */
export interface ProviderKeys {
  llm: LlmKeyPreview | null;
  tts: TtsKeyPreview | null;
}

export const TTS_KEY_PROVIDER = TTS_PROVIDER_ID;
