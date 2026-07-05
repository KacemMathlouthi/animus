/** Cost metering: converts provider usage (LLM tokens, TTS characters) into a
 * single money unit — integer micro-USD (1 µ$ = $1e-6). Everything the credit
 * system stores and compares is micro-USD, so per-token costs (Opus ≈ 5 µ$ per
 * input token) never round to zero. This module is PURE and framework-agnostic;
 * the API meters against it and the web formats balances with it.
 *
 * Prices below are the exact per-model list prices from LiteLLM's public price
 * list (input/output USD per million tokens). Bump them here when provider
 * pricing changes — this is the single source of truth. */

/** Micro-USD per whole dollar. */
export const MICROS_PER_DOLLAR = 1_000_000;

/** The one-time free grant a new account starts with, in micro-USD ($5). Kept in
 * sync with the `user_credits.balance_micros` column default in the DB schema —
 * change both together. Also the denominator for the balance gauge in the UI. */
export const FREE_GRANT_MICROS = 5 * MICROS_PER_DOLLAR;

interface LlmPrice {
  /** USD per million input tokens. */
  inputPerMTokUsd: number;
  /** USD per million output tokens. */
  outputPerMTokUsd: number;
}

/** Exact per-model prices (USD per million tokens), from LiteLLM's public price
 * list, keyed by the model ids offered in `@animus/core` providers. We only meter
 * our own Bedrock Claude model (BYOK is not metered), but the map covers every
 * offered model so the resolver stays exact if the metered model changes. */
const LLM_PRICES: Record<string, LlmPrice> = {
  // Anthropic
  "claude-opus-4-8": { inputPerMTokUsd: 5, outputPerMTokUsd: 25 },
  "claude-opus-4-7": { inputPerMTokUsd: 5, outputPerMTokUsd: 25 },
  "claude-opus-4-6": { inputPerMTokUsd: 5, outputPerMTokUsd: 25 },
  "claude-sonnet-5": { inputPerMTokUsd: 2, outputPerMTokUsd: 10 },
  "claude-sonnet-4-6": { inputPerMTokUsd: 3, outputPerMTokUsd: 15 },
  // OpenAI
  "gpt-5.5": { inputPerMTokUsd: 5, outputPerMTokUsd: 30 },
  "gpt-5.4-pro": { inputPerMTokUsd: 30, outputPerMTokUsd: 180 },
  "gpt-5.4": { inputPerMTokUsd: 2.5, outputPerMTokUsd: 15 },
  "gpt-5.4-mini": { inputPerMTokUsd: 0.75, outputPerMTokUsd: 4.5 },
  // Google
  "gemini-3.5-flash": { inputPerMTokUsd: 1.5, outputPerMTokUsd: 9 },
  "gemini-3.1-flash-lite": { inputPerMTokUsd: 0.25, outputPerMTokUsd: 1.5 },
  "gemini-3.1-pro-preview": { inputPerMTokUsd: 2, outputPerMTokUsd: 12 },
};

/** Fallback when a metered model isn't in the table — our default Bedrock tier
 * (Opus), so an unpriced model is never wildly mis-charged. */
const DEFAULT_LLM_PRICE: LlmPrice = {
  inputPerMTokUsd: 5,
  outputPerMTokUsd: 25,
};

/** Resolve a model id to its price. Exact match first; otherwise the longest
 * price key it contains — our metered model is a Bedrock inference-profile id
 * (e.g. "us.anthropic.claude-opus-4-6-v1") that embeds the plain model id. */
function priceForModel(modelId: string): LlmPrice {
  const exact = LLM_PRICES[modelId];
  if (exact) {
    return exact;
  }
  let best: LlmPrice | undefined;
  let bestLen = 0;
  for (const [key, price] of Object.entries(LLM_PRICES)) {
    if (key.length > bestLen && modelId.includes(key)) {
      best = price;
      bestLen = key.length;
    }
  }
  return best ?? DEFAULT_LLM_PRICE;
}

/** USD per 1,000 synthesized characters of ElevenLabs narration. Conservative
 * relative to typical paid-tier effective rates. */
export const ELEVENLABS_USD_PER_1K_CHARS = 0.3;

/** Cost in micro-USD of an LLM turn, from summed token usage. Missing/negative
 * token counts are treated as zero. */
export function estimateLlmCostMicros(input: {
  model: string;
  inputTokens: number;
  outputTokens: number;
}): number {
  const price = priceForModel(input.model);
  const inTok = Math.max(0, input.inputTokens || 0);
  const outTok = Math.max(0, input.outputTokens || 0);
  const usd =
    (inTok * price.inputPerMTokUsd) / 1_000_000 +
    (outTok * price.outputPerMTokUsd) / 1_000_000;
  return Math.round(usd * MICROS_PER_DOLLAR);
}

/** Cost in micro-USD of synthesizing `chars` characters of narration. */
export function ttsCostMicros(chars: number): number {
  const n = Math.max(0, chars || 0);
  const usd = (n / 1000) * ELEVENLABS_USD_PER_1K_CHARS;
  return Math.round(usd * MICROS_PER_DOLLAR);
}

/** Micro-USD → whole dollars (float), for display math. */
export function microsToUsd(micros: number): number {
  return micros / MICROS_PER_DOLLAR;
}

/** Format a micro-USD amount as a dollar string, e.g. `$4.20`. Clamps negatives
 * to `$0.00` so a slight overshoot never shows a negative balance to the user. */
export function formatUsd(micros: number): string {
  const usd = Math.max(0, microsToUsd(micros));
  return `$${usd.toFixed(2)}`;
}
