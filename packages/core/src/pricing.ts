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

/** Anthropic prompt-cache multipliers on the base input rate: a cache *read* is
 * billed at 10% of a normal input token, a 5-minute cache *write* at 125%. We
 * only ever meter Bedrock Claude (see LLM_PRICES), so this one schedule applies
 * to every priced model. A tool loop re-sends a large system prompt every step,
 * so cache reads dominate — pricing them at the full input rate over-charges. */
const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_MULTIPLIER = 1.25;

interface LlmPrice {
  /** USD per million input tokens. */
  inputPerMTokUsd: number;
  /** USD per million output tokens. */
  outputPerMTokUsd: number;
}

/** Exact per-model prices (USD per million tokens), from LiteLLM's public price
 * list. Only the platform's Bedrock **Claude** model is ever metered — BYOK
 * (Anthropic/OpenAI/Google on the user's own key) is never charged, so those
 * models are intentionally absent here; the BYOK selection list lives in
 * `providers.ts`. `BEDROCK_MODEL` is one of these Claude ids, embedded in a
 * Bedrock inference-profile id and resolved by the substring match below. */
const LLM_PRICES: Record<string, LlmPrice> = {
  "claude-opus-4-8": { inputPerMTokUsd: 5, outputPerMTokUsd: 25 },
  "claude-opus-4-7": { inputPerMTokUsd: 5, outputPerMTokUsd: 25 },
  "claude-opus-4-6": { inputPerMTokUsd: 5, outputPerMTokUsd: 25 },
  "claude-sonnet-5": { inputPerMTokUsd: 2, outputPerMTokUsd: 10 },
  "claude-sonnet-4-6": { inputPerMTokUsd: 3, outputPerMTokUsd: 15 },
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

/** Cost in micro-USD of an LLM turn, from summed token usage. `inputTokens` is
 * the *total* prompt tokens for the turn and already includes any cache-read and
 * cache-write tokens; passing `cacheReadTokens`/`cacheWriteTokens` re-prices
 * those subsets at the cache multipliers instead of the full input rate. Missing
 * or negative counts are treated as zero, and the cached subsets are clamped so
 * they can never exceed the total (which would make the uncached remainder go
 * negative). Omitting the cache fields reproduces the flat all-input pricing. */
export function estimateLlmCostMicros(input: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}): number {
  const price = priceForModel(input.model);
  const totalIn = Math.max(0, input.inputTokens || 0);
  const outTok = Math.max(0, input.outputTokens || 0);
  // Clamp the cached subsets to the total so the uncached remainder stays >= 0.
  const cacheRead = Math.min(totalIn, Math.max(0, input.cacheReadTokens || 0));
  const cacheWrite = Math.min(
    totalIn - cacheRead,
    Math.max(0, input.cacheWriteTokens || 0)
  );
  const noCache = totalIn - cacheRead - cacheWrite;
  const inputUsd =
    (noCache * price.inputPerMTokUsd +
      cacheRead * price.inputPerMTokUsd * CACHE_READ_MULTIPLIER +
      cacheWrite * price.inputPerMTokUsd * CACHE_WRITE_MULTIPLIER) /
    1_000_000;
  const outputUsd = (outTok * price.outputPerMTokUsd) / 1_000_000;
  return Math.round((inputUsd + outputUsd) * MICROS_PER_DOLLAR);
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

/** Format a micro-USD cost with sub-cent precision, e.g. `$0.0132` — per-turn
 * ledger amounts are usually fractions of a cent, which `formatUsd` would
 * flatten to `$0.00`. Dollar-plus amounts keep the familiar two decimals. */
export function formatUsdPrecise(micros: number): string {
  const usd = Math.max(0, microsToUsd(micros));
  return usd >= 1 ? `$${usd.toFixed(2)}` : `$${usd.toFixed(4)}`;
}
