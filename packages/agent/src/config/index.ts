/** Resolves the agent's language model.
 *
 * Default: Claude via Amazon Bedrock (our key, metered). Credentials/region come
 * from AWS_* env vars or the AWS credential chain (nothing passed explicitly),
 * and the id is a Bedrock inference profile from env.
 *
 * BYOK: when the caller passes a decrypted LLM key, the agent runs on that
 * provider's own SDK client with the user's chosen model — and that turn is not
 * metered (the user pays their provider directly). */

import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { ProviderId } from "@animus/core";
import { getServerEnv } from "@animus/core/env";
import type { LanguageModel } from "ai";

/** A decrypted BYO LLM key, resolved by the API from the user's stored keys. */
export interface LlmKey {
  apiKey: string;
  model: string;
  provider: ProviderId;
}

/** The Bedrock model (our key). `modelId` overrides the env inference profile —
 * used by the lightweight title-generation helper. Credentials are passed
 * EXPLICITLY (never via the SDK's AWS_* env chain): Vercel shadows
 * user-supplied AWS_* variables at runtime, so relying on the chain works
 * locally and silently fails in production. Undefined values (local dev
 * without BEDROCK_*) fall back to the SDK's own chain. */
export function getModel(modelId?: string): LanguageModel {
  const env = getServerEnv();
  const bedrock = createAmazonBedrock({
    accessKeyId: env.bedrockAccessKeyId,
    secretAccessKey: env.bedrockSecretAccessKey,
    region: env.bedrockRegion,
  });
  return bedrock(modelId ?? env.bedrockModel);
}

/** Build a BYOK model from a decrypted key. Exhaustive over the LLM providers. */
function buildByokModel(key: LlmKey): LanguageModel {
  switch (key.provider) {
    case "anthropic":
      return createAnthropic({ apiKey: key.apiKey })(key.model);
    case "openai":
      return createOpenAI({ apiKey: key.apiKey })(key.model);
    case "google":
      return createGoogleGenerativeAI({ apiKey: key.apiKey })(key.model);
    default: {
      const exhaustive: never = key.provider;
      throw new Error(`Unsupported LLM provider: ${String(exhaustive)}`);
    }
  }
}

/** Resolve the model for a turn. Returns the model plus whether the turn should
 * be metered and which model id to price it against (only meaningful when
 * metered). */
export function resolveModel(llmKey?: LlmKey): {
  isLlmMetered: boolean;
  model: LanguageModel;
  modelId: string;
} {
  if (llmKey) {
    return {
      model: buildByokModel(llmKey),
      isLlmMetered: false,
      modelId: llmKey.model,
    };
  }
  return {
    model: getModel(),
    isLlmMetered: true,
    modelId: getServerEnv().bedrockModel,
  };
}
