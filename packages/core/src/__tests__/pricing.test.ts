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

  it("prices each offered model exactly", () => {
    // gpt-5.4-pro: $30/M input.
    expect(
      estimateLlmCostMicros({
        model: "gpt-5.4-pro",
        inputTokens: 1_000_000,
        outputTokens: 0,
      })
    ).toBe(30_000_000);
    // gemini-3.1-flash-lite: $0.25/M input.
    expect(
      estimateLlmCostMicros({
        model: "gemini-3.1-flash-lite",
        inputTokens: 1_000_000,
        outputTokens: 0,
      })
    ).toBe(250_000);
    // claude-sonnet-5: $2/M input.
    expect(
      estimateLlmCostMicros({
        model: "claude-sonnet-5",
        inputTokens: 1_000_000,
        outputTokens: 0,
      })
    ).toBe(2_000_000);
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
