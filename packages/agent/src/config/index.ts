/** Resolves the agent's model: Claude via Amazon Bedrock. Credentials/region
 * come from AWS_* env vars or the AWS credential chain (nothing passed
 * explicitly). The id is a Bedrock inference profile from env, unless a caller
 * passes a specific lightweight helper model. */

import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { getServerEnv } from "@animus/core/env";
import type { LanguageModel } from "ai";

export function getModel(modelId?: string): LanguageModel {
  const env = getServerEnv();
  const bedrock = createAmazonBedrock();
  return bedrock(modelId ?? env.bedrockModel);
}
