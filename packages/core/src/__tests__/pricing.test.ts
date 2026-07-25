import { describe, expect, it } from "vitest";
import {
  ELEVENLABS_USD_PER_1K_CHARS,
  estimateLlmCostMicros,
  FREE_GRANT_MICROS,
  formatUsd,
  MICROS_PER_DOLLAR,
  microsToUsd,
  ttsCostMicros,
} from "../pricing.ts";

describe("constants", () => {
  it("free grant is $5 in micro-USD", () => {
    expect(FREE_GRANT_MICROS).toBe(5_000_000);
    expect(MICROS_PER_DOLLAR).toBe(1_000_000);
  });
});

describe("estimateLlmCostMicros", () => {
  it("prices Opus 4.6 at $5/$25 per million tokens (exact)", () => {
    // 1M input + 1M output = $5 + $25 = $30 = 30_000_000 µ$.
    expect(
      estimateLlmCostMicros({
        model: "claude-opus-4-6",
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      })
    ).toBe(30_000_000);
  });

  it("resolves the Bedrock inference-profile id to the embedded model price", () => {
    // "us.anthropic.claude-opus-4-6-v1" contains "claude-opus-4-6" → $5/M input.
    expect(
      estimateLlmCostMicros({
        model: "us.anthropic.claude-opus-4-6-v1",
        inputTokens: 1_000_000,
        outputTokens: 0,
      })
    ).toBe(5_000_000);
  });

  it("prices each metered Claude model exactly", () => {
    // Only the platform's Bedrock Claude models are priced (BYOK is not metered).
    // claude-sonnet-5: $2/M input.
    expect(
      estimateLlmCostMicros({
        model: "claude-sonnet-5",
        inputTokens: 1_000_000,
        outputTokens: 0,
      })
    ).toBe(2_000_000);
    // claude-sonnet-4-6: $3/M input.
    expect(
      estimateLlmCostMicros({
        model: "claude-sonnet-4-6",
        inputTokens: 1_000_000,
        outputTokens: 0,
      })
    ).toBe(3_000_000);
  });

  it("falls back to the Opus tier for an unknown model", () => {
    const unknown = estimateLlmCostMicros({
      model: "some-mystery-model",
      inputTokens: 1_000_000,
      outputTokens: 0,
    });
    expect(unknown).toBe(5_000_000); // default $5/M input
  });

  it("treats missing/negative token counts as zero", () => {
    expect(
      estimateLlmCostMicros({
        model: "claude-opus-4-6",
        inputTokens: -5,
        outputTokens: Number.NaN,
      })
    ).toBe(0);
  });

  it("prices cache-read tokens at 10% of the base input rate", () => {
    // 1M input, all read from cache: $5/M * 0.1 = $0.50 = 500_000 µ$.
    expect(
      estimateLlmCostMicros({
        model: "claude-opus-4-6",
        inputTokens: 1_000_000,
        outputTokens: 0,
        cacheReadTokens: 1_000_000,
      })
    ).toBe(500_000);
  });

  it("prices cache-write tokens at 125% of the base input rate", () => {
    // 1M input, all cache writes: $5/M * 1.25 = $6.25 = 6_250_000 µ$.
    expect(
      estimateLlmCostMicros({
        model: "claude-opus-4-6",
        inputTokens: 1_000_000,
        outputTokens: 0,
        cacheWriteTokens: 1_000_000,
      })
    ).toBe(6_250_000);
  });

  it("prices a mixed input (uncached + cache read + cache write) correctly", () => {
    // 200k uncached ($1.00) + 700k read ($0.35) + 100k write ($0.625) = $1.975.
    expect(
      estimateLlmCostMicros({
        model: "claude-opus-4-6",
        inputTokens: 1_000_000,
        outputTokens: 0,
        cacheReadTokens: 700_000,
        cacheWriteTokens: 100_000,
      })
    ).toBe(1_975_000);
  });

  it("clamps cached subsets so the uncached remainder never goes negative", () => {
    // Cached subsets exceed the total: read is capped at the total, write at 0.
    expect(
      estimateLlmCostMicros({
        model: "claude-opus-4-6",
        inputTokens: 1_000_000,
        outputTokens: 0,
        cacheReadTokens: 2_000_000,
        cacheWriteTokens: 2_000_000,
      })
    ).toBe(500_000); // all 1M priced as cache reads
  });

  it("omitting cache fields reproduces the flat all-input price", () => {
    expect(
      estimateLlmCostMicros({
        model: "claude-opus-4-6",
        inputTokens: 1_000_000,
        outputTokens: 0,
      })
    ).toBe(5_000_000);
  });

  it("prices an unknown model at the Opus fallback tier", () => {
    // Not in the Claude-only table → default $5/M input, still cache-aware.
    expect(
      estimateLlmCostMicros({
        model: "some-mystery-model",
        inputTokens: 1_000_000,
        outputTokens: 0,
        cacheReadTokens: 1_000_000,
      })
    ).toBe(500_000); // $5/M * 0.1 cache-read
  });
});

describe("ttsCostMicros", () => {
  it("charges the per-1k-char rate", () => {
    expect(ttsCostMicros(1000)).toBe(
      Math.round(ELEVENLABS_USD_PER_1K_CHARS * MICROS_PER_DOLLAR)
    );
  });

  it("is proportional and zero for no characters", () => {
    expect(ttsCostMicros(0)).toBe(0);
    expect(ttsCostMicros(2000)).toBe(ttsCostMicros(1000) * 2);
  });

  it("clamps negatives to zero", () => {
    expect(ttsCostMicros(-100)).toBe(0);
  });
});

describe("microsToUsd / formatUsd", () => {
  it("converts micro-USD to dollars", () => {
    expect(microsToUsd(4_200_000)).toBeCloseTo(4.2);
  });

  it("formats a positive balance", () => {
    expect(formatUsd(4_200_000)).toBe("$4.20");
    expect(formatUsd(5_000_000)).toBe("$5.00");
  });

  it("clamps a negative balance to $0.00", () => {
    expect(formatUsd(-1000)).toBe("$0.00");
  });
});
