/** Resolves the language model the agent runs on: Anthropic Claude served via
 * Amazon Bedrock. Credentials and region come from the AWS_* env vars or the
 * AWS credential chain (e.g. an EC2/ECS IAM role), so nothing is passed
 * explicitly. The model id is a Bedrock region inference profile, set via env. */

import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { getServerEnv } from "@animus/core/env";
import type { LanguageModel } from "ai";

export function getModel(): LanguageModel {
  const env = getServerEnv();
  const bedrock = createAmazonBedrock();
  return bedrock(env.bedrockModel);
}
