import {
  estimateLlmCostMicros,
  FREE_GRANT_MICROS,
  ttsCostMicros,
} from "@animus/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const USER_CREDITS = { __table: "user_credits" };
const USAGE_EVENT = { __table: "usage_event" };
const CONVERSATION = { __table: "conversation", id: "id", title: "title" };

const h = vi.hoisted(() => ({
  findFirst: vi.fn(),
  selectRows: vi.fn(() => [{ total: "0" }]),
  /** Queued results for chained selects (listUsage); falls back to selectRows. */
  selectQueue: [] as unknown[],
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
    // A chainable, thenable select: every chain method returns the builder and
    // awaiting it resolves the next queued result (or the legacy selectRows).
    select: () => {
      const chain = {
        from: () => chain,
        where: () => chain,
        orderBy: () => chain,
        limit: () => chain,
        offset: () => chain,
        // biome-ignore lint/suspicious/noThenProperty: intentionally thenable — drizzle's query builder is awaited directly, so the mock must be too.
        then: (
          resolve: (value: unknown) => unknown,
          reject?: (error: unknown) => unknown
        ) => {
          const result =
            h.selectQueue.length > 0 ? h.selectQueue.shift() : h.selectRows();
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return chain;
    },
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
  conversation: CONVERSATION,
  count: vi.fn(() => ({ count: true })),
  desc: vi.fn((column) => ({ desc: column })),
  eq: vi.fn((left, right) => ({ eq: [left, right] })),
  inArray: vi.fn((column, values) => ({ inArray: [column, values] })),
  sqlExpr: vi.fn(() => ({ sql: true })),
  userCredits: USER_CREDITS,
  usageEvent: USAGE_EVENT,
}));

const { getOrCreateCredits, listUsage, settleUsage } = await import(
  "../services/credits.ts"
);

beforeEach(() => {
  vi.clearAllMocks();
  h.selectRows.mockReturnValue([{ total: "0" }]);
  h.selectQueue.length = 0;
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

describe("listUsage", () => {
  const CREATED = new Date("2026-07-19T12:00:00Z");

  const row = (overrides: Record<string, unknown>) => ({
    id: "evt-1",
    userId: "u1",
    conversationId: null,
    turnId: "t1",
    model: null,
    inputTokens: 0,
    outputTokens: 0,
    ttsChars: 0,
    costMicros: 0,
    createdAt: CREATED,
    ...overrides,
  });

  it("maps rows, attaches surviving conversation titles, and reports total", async () => {
    h.selectQueue.push(
      [
        row({
          id: "evt-1",
          conversationId: "c1",
          turnId: "t1",
          model: "us.anthropic.claude-sonnet-5",
          inputTokens: 1200,
          outputTokens: 300,
          ttsChars: 900,
          costMicros: 12_345,
        }),
        row({
          id: "evt-2",
          conversationId: "c-deleted",
          turnId: "t2",
          ttsChars: 50,
          costMicros: 15,
        }),
      ],
      [{ total: 2 }],
      [{ id: "c1", title: "Fourier transforms" }]
    );

    const page = await listUsage({ userId: "u1", limit: 20, offset: 0 });

    expect(page.total).toBe(2);
    expect(page.limit).toBe(20);
    expect(page.offset).toBe(0);
    expect(page.items[0]).toEqual({
      id: "evt-1",
      conversationId: "c1",
      conversationTitle: "Fourier transforms",
      turnId: "t1",
      model: "us.anthropic.claude-sonnet-5",
      inputTokens: 1200,
      outputTokens: 300,
      ttsChars: 900,
      costMicros: 12_345,
      createdAt: CREATED.toISOString(),
    });
    // Deleted conversation: id survives, title is null, BYOK model is null.
    expect(page.items[1]).toMatchObject({
      conversationId: "c-deleted",
      conversationTitle: null,
      model: null,
    });
  });

  it("returns an empty page without querying titles when there are no rows", async () => {
    h.selectQueue.push([], [{ total: 0 }]);

    const page = await listUsage({ userId: "u1", limit: 10, offset: 40 });

    expect(page).toEqual({ items: [], total: 0, limit: 10, offset: 40 });
    // Only the rows + count selects ran — nothing left unconsumed.
    expect(h.selectQueue.length).toBe(0);
  });
});
