/** Resolves the language model the agent runs on. The free tier uses our
 * Anthropic key (BYO keys will plug in here later); the model id is configurable
 * via env, defaulting to Claude. Validated lazily so the API can boot without a
 * key — only running the agent requires it. */

import { createAnthropic } from "@ai-sdk/anthropic";
import { getServerEnv } from "@animus/core/env";
import type { LanguageModel } from "ai";

export function getModel(): LanguageModel {
  const env = getServerEnv();
  if (!env.anthropicApiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set — required to run the agent."
    );
  }
  const anthropic = createAnthropic({ apiKey: env.anthropicApiKey });
  return anthropic(env.anthropicModel);
}
