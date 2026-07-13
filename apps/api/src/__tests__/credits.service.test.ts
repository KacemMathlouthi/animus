import {
  estimateLlmCostMicros,
  FREE_GRANT_MICROS,
  ttsCostMicros,
} from "@animus/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const USER_CREDITS = { __table: "user_credits" };
const USAGE_EVENT = { __table: "usage_event" };

const h = vi.hoisted(() => ({
  findFirst: vi.fn(),
  selectRows: vi.fn(() => [{ total: "0" }]),
  usageReturning: vi.fn(() => [{ id: "evt-1" }]),
  updateWhere: vi.fn(() => Promise.resolve(undefined)),
  insertCalls: [] as Array<{ table: unknown; values: unknown }>,
  capUsd: undefined as number | undefined,
}));

vi.mock("@animus/core/env", () => ({
  getServerEnv: () => ({ creditsGlobalCapUsd: h.capUsd }),
}));

vi.mock("@animus/db", () => ({
  db: {
    query: { userCredits: { findFirst: h.findFirst } },
    select: () => ({ from: () => Promise.resolve(h.selectRows()) }),
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        h.insertCalls.push({ table, values });
        return {
          onConflictDoNothing: () => {
            if (table === USAGE_EVENT) {
              return { returning: () => Promise.resolve(h.usageReturning()) };
            }
            return Promise.resolve(undefined);
          },
        };
      },
    }),
    update: () => ({ set: () => ({ where: h.updateWhere }) }),
  },
  eq: vi.fn((left, right) => ({ eq: [left, right] })),
  sqlExpr: vi.fn(() => ({ sql: true })),
  userCredits: USER_CREDITS,
  usageEvent: USAGE_EVENT,
}));

const { getOrCreateCredits, settleUsage } = await import(
  "../services/credits.ts"
);

beforeEach(() => {
  vi.clearAllMocks();
  h.selectRows.mockReturnValue([{ total: "0" }]);
  h.usageReturning.mockReturnValue([{ id: "evt-1" }]);
  h.updateWhere.mockResolvedValue(undefined);
  h.insertCalls.length = 0;
  h.capUsd = undefined;
});

describe("getOrCreateCredits", () => {
  it("returns the existing balance without seeding", async () => {
    h.findFirst.mockResolvedValueOnce({ balanceMicros: 1234 });
    await expect(getOrCreateCredits("u1")).resolves.toEqual({
      balanceMicros: 1234,
      grantMicros: FREE_GRANT_MICROS,
    });
    expect(h.insertCalls).toHaveLength(0);
  });

  it("seeds the free grant on first read", async () => {
    h.findFirst
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ balanceMicros: FREE_GRANT_MICROS });

    await expect(getOrCreateCredits("u1")).resolves.toEqual({
      balanceMicros: FREE_GRANT_MICROS,
      grantMicros: FREE_GRANT_MICROS,
    });
    expect(h.insertCalls[0]?.values).toEqual({
      userId: "u1",
      balanceMicros: FREE_GRANT_MICROS,
    });
  });

  it("seeds $0 when the global cap is exceeded", async () => {
    h.capUsd = 100; // $100 cap
    h.selectRows.mockReturnValue([{ total: String(200 * 1_000_000) }]); // $200 spent
    h.findFirst
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ balanceMicros: 0 });

    await expect(getOrCreateCredits("u1")).resolves.toEqual({
      balanceMicros: 0,
      grantMicros: FREE_GRANT_MICROS,
    });
    expect(h.insertCalls[0]?.values).toEqual({
      userId: "u1",
      balanceMicros: 0,
    });
  });

  it("still seeds the grant when under the cap", async () => {
    h.capUsd = 100;
    h.selectRows.mockReturnValue([{ total: String(10 * 1_000_000) }]); // $10 spent
    h.findFirst
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ balanceMicros: FREE_GRANT_MICROS });

    await getOrCreateCredits("u1");
    expect(h.insertCalls[0]?.values).toEqual({
      userId: "u1",
      balanceMicros: FREE_GRANT_MICROS,
    });
  });
});

const BASE = {
  userId: "u1",
  conversationId: "c1",
  turnId: "t1",
  model: "claude-opus-4-6",
  inputTokens: 10_000,
  outputTokens: 5000,
  ttsChars: 2000,
};

describe("settleUsage", () => {
  it("charges LLM + TTS, records the event, and debits the balance", async () => {
    const expected =
      estimateLlmCostMicros({
        model: BASE.model,
        inputTokens: BASE.inputTokens,
        outputTokens: BASE.outputTokens,
      }) + ttsCostMicros(BASE.ttsChars);

    const charged = await settleUsage({
      ...BASE,
      isLlmMetered: true,
      isTtsMetered: true,
    });

    expect(charged).toBe(expected);
    const event = h.insertCalls.find((call) => call.table === USAGE_EVENT);
    expect(event?.values).toMatchObject({
      turnId: "t1",
      model: "claude-opus-4-6",
      ttsChars: 2000,
      costMicros: expected,
    });
    expect(h.updateWhere).toHaveBeenCalledTimes(1);
  });

  it("charges TTS only when the LLM is BYOK", async () => {
    const charged = await settleUsage({
      ...BASE,
      isLlmMetered: false,
      isTtsMetered: true,
    });
    expect(charged).toBe(ttsCostMicros(BASE.ttsChars));
    const event = h.insertCalls.find((call) => call.table === USAGE_EVENT);
    // Model is null because the LLM was not metered.
    expect(event?.values).toMatchObject({ model: null });
  });

  it("does nothing when fully BYOK (no billable cost)", async () => {
    const charged = await settleUsage({
      ...BASE,
      isLlmMetered: false,
      isTtsMetered: false,
    });
    expect(charged).toBe(0);
    expect(h.insertCalls).toHaveLength(0);
    expect(h.updateWhere).not.toHaveBeenCalled();
  });

  it("is idempotent — a duplicate turn is not charged twice", async () => {
    h.usageReturning.mockReturnValue([]); // insert hit the unique constraint
    const charged = await settleUsage({
      ...BASE,
      isLlmMetered: true,
      isTtsMetered: true,
    });
    expect(charged).toBe(0);
    expect(h.updateWhere).not.toHaveBeenCalled();
  });
});
