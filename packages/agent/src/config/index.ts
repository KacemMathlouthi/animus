/** Resolves the agent's model: Claude via Bedrock on our key by default, or
 * the user's own provider client when they brought a key, in which case the
 * turn is not metered because they pay their provider directly. */

import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { ProviderId } from "@animus/core";
import { getServerEnv } from "@animus/core/env";
import type { LanguageModel } from "ai";

export interface LlmKey {
  apiKey: string;
  model: string;
  provider: ProviderId;
}

/** `modelId` overrides the env inference profile, for title generation.
 * Credentials go in explicitly, never via the SDK's AWS_* chain: Vercel shadows
 * those at runtime, so the chain works locally and fails silently in prod. */
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
