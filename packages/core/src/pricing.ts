/** Converts provider usage into integer micro-USD (1 µ$ = $1e-6), so per-token
 * costs never round to zero. Pure. Prices are LiteLLM's public list prices and
 * this is the single source of truth for them. */

export const MICROS_PER_DOLLAR = 1_000_000;

/** The one-time $5 grant. Mirrors the `user_credits.balance_micros` column
 * default — change both together. Also the balance gauge's denominator. */
export const FREE_GRANT_MICROS = 5 * MICROS_PER_DOLLAR;

/** Anthropic cache multipliers on the input rate. A tool loop re-sends a large
 * system prompt every step, so cache reads dominate and pricing them at the
 * full rate over-charges. Only Bedrock Claude is metered, so one schedule. */
const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_MULTIPLIER = 1.25;

interface LlmPrice {
  /** USD per million input tokens. */
  inputPerMTokUsd: number;
  /** USD per million output tokens. */
  outputPerMTokUsd: number;
}

/** USD per million tokens. Only the platform's Bedrock Claude model is metered,
 * so BYOK models are deliberately absent (their list lives in `providers.ts`). */
const LLM_PRICES: Record<string, LlmPrice> = {
  "claude-opus-4-8": { inputPerMTokUsd: 5, outputPerMTokUsd: 25 },
  "claude-opus-4-7": { inputPerMTokUsd: 5, outputPerMTokUsd: 25 },
  "claude-opus-4-6": { inputPerMTokUsd: 5, outputPerMTokUsd: 25 },
  "claude-sonnet-5": { inputPerMTokUsd: 2, outputPerMTokUsd: 10 },
  "claude-sonnet-4-6": { inputPerMTokUsd: 3, outputPerMTokUsd: 15 },
};

/** Our Opus tier, so an unpriced model is never wildly mis-charged. */
const DEFAULT_LLM_PRICE: LlmPrice = {
  inputPerMTokUsd: 5,
  outputPerMTokUsd: 25,
};

/** Exact match, else the longest key contained in the id: the metered model is
 * an inference-profile id like "us.anthropic.claude-opus-4-6-v1". */
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

/** USD per 1k narration characters. Conservative against paid-tier rates. */
export const ELEVENLABS_USD_PER_1K_CHARS = 0.3;

/** `inputTokens` is the turn total and already includes the cached subsets;
 * passing those re-prices them at the cache rates. Missing or negative counts
 * read as zero, and omitting the cache fields gives flat all-input pricing. */
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

export function ttsCostMicros(chars: number): number {
  const n = Math.max(0, chars || 0);
  const usd = (n / 1000) * ELEVENLABS_USD_PER_1K_CHARS;
  return Math.round(usd * MICROS_PER_DOLLAR);
}

export function microsToUsd(micros: number): number {
  return micros / MICROS_PER_DOLLAR;
}

/** Clamps negatives to `$0.00`: a slight settlement overshoot must never show
 * the user a negative balance. */
export function formatUsd(micros: number): string {
  const usd = Math.max(0, microsToUsd(micros));
  return `$${usd.toFixed(2)}`;
}

/** Sub-cent precision for ledger rows, which `formatUsd` would flatten to
 * `$0.00`. Dollar-plus amounts keep the familiar two decimals. */
export function formatUsdPrecise(micros: number): string {
  const usd = Math.max(0, microsToUsd(micros));
  return usd >= 1 ? `$${usd.toFixed(2)}` : `$${usd.toFixed(4)}`;
}
