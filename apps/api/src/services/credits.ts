/** Credit accounting: seed a user's balance on first touch, expose it, and
 * settle the metered cost of a completed turn. Money is integer micro-USD
 * throughout (see `@animus/core` pricing). Settlement is idempotent — keyed by
 * the completed assistant message id — so a turn is never charged twice.
 *
 * Enforcement is balance-only: the chat route refuses to *start* a metered turn
 * at a non-positive balance, but a running turn is never killed, so a balance
 * may end slightly negative. */

import { randomUUID } from "node:crypto";
import {
  type CreditsBalance,
  estimateLlmCostMicros,
  FREE_GRANT_MICROS,
  MICROS_PER_DOLLAR,
  ttsCostMicros,
  type UsageList,
} from "@animus/core";
import { getServerEnv } from "@animus/core/env";
import {
  conversation,
  count,
  db,
  desc,
  eq,
  inArray,
  sqlExpr,
  usageEvent,
  userCredits,
} from "@animus/db";

function toBalance(balanceMicros: number): CreditsBalance {
  return { balanceMicros, grantMicros: FREE_GRANT_MICROS };
}

/** True when the global free-spend cap is configured and already exceeded, in
 * which case brand-new accounts are seeded at $0 instead of the free grant. */
async function shouldWithholdGrant(): Promise<boolean> {
  const capUsd = getServerEnv().creditsGlobalCapUsd;
  if (!capUsd) {
    return false;
  }
  const [row] = await db
    .select({
      total: sqlExpr<string>`coalesce(sum(${usageEvent.costMicros}), 0)`,
    })
    .from(usageEvent);
  const spentMicros = Number(row?.total ?? 0);
  return spentMicros >= capUsd * MICROS_PER_DOLLAR;
}

/** The user's balance, seeding the row with the free grant (or $0 when the
 * global cap is exceeded) the first time it is read. */
export async function getOrCreateCredits(
  userId: string
): Promise<CreditsBalance> {
  const existing = await db.query.userCredits.findFirst({
    where: eq(userCredits.userId, userId),
  });
  if (existing) {
    return toBalance(existing.balanceMicros);
  }

  const initial = (await shouldWithholdGrant()) ? 0 : FREE_GRANT_MICROS;
  // onConflictDoNothing guards the race where two concurrent turns both seed.
  await db
    .insert(userCredits)
    .values({ userId, balanceMicros: initial })
    .onConflictDoNothing();

  const row = await db.query.userCredits.findFirst({
    where: eq(userCredits.userId, userId),
  });
  return toBalance(row?.balanceMicros ?? initial);
}

export interface SettleUsageInput {
  conversationId: string | null;
  inputTokens: number;
  /** Whether the LLM ran on our key (metered) or the user's own (not). */
  isLlmMetered: boolean;
  /** Whether TTS ran on our key (metered) or the user's own (not). */
  isTtsMetered: boolean;
  /** The metered LLM model id (priced only when `isLlmMetered`). */
  model: string;
  outputTokens: number;
  ttsChars: number;
  /** The per-request turn id — the idempotency key (one settlement per request). */
  turnId: string;
  userId: string;
}

/** Charge a completed turn against the user's balance and record the usage.
 * No-op when nothing is billable (fully BYOK, or zero usage) or when this turn
 * was already settled. Returns the micro-USD charged. */
export async function settleUsage(input: SettleUsageInput): Promise<number> {
  const llmCost = input.isLlmMetered
    ? estimateLlmCostMicros({
        model: input.model,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
      })
    : 0;
  const ttsCost = input.isTtsMetered ? ttsCostMicros(input.ttsChars) : 0;
  const costMicros = llmCost + ttsCost;

  if (costMicros <= 0) {
    return 0;
  }

  // Record the turn first; the unique turn_id makes this the idempotency guard —
  // if the row already exists, the debit below is skipped.
  const inserted = await db
    .insert(usageEvent)
    .values({
      id: randomUUID(),
      userId: input.userId,
      conversationId: input.conversationId,
      turnId: input.turnId,
      model: input.isLlmMetered ? input.model : null,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      ttsChars: input.ttsChars,
      costMicros,
    })
    .onConflictDoNothing({ target: usageEvent.turnId })
    .returning({ id: usageEvent.id });

  if (inserted.length === 0) {
    return 0;
  }

  await db
    .update(userCredits)
    .set({
      balanceMicros: sqlExpr`${userCredits.balanceMicros} - ${costMicros}`,
      updatedAt: new Date(),
    })
    .where(eq(userCredits.userId, input.userId));

  return costMicros;
}

export interface ListUsageInput {
  limit: number;
  offset: number;
  userId: string;
}

/** A page of the caller's usage ledger, newest first, with conversation titles
 * attached where the conversation still exists (the ledger keeps the plain id
 * after deletion, so cost history survives). */
export async function listUsage({
  userId,
  limit,
  offset,
}: ListUsageInput): Promise<UsageList> {
  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(usageEvent)
      .where(eq(usageEvent.userId, userId))
      .orderBy(desc(usageEvent.createdAt), desc(usageEvent.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(usageEvent)
      .where(eq(usageEvent.userId, userId)),
  ]);

  const conversationIds = [
    ...new Set(
      rows
        .map((row) => row.conversationId)
        .filter((id): id is string => id !== null)
    ),
  ];
  const titles = conversationIds.length
    ? await db
        .select({ id: conversation.id, title: conversation.title })
        .from(conversation)
        .where(inArray(conversation.id, conversationIds))
    : [];
  const titleById = new Map(titles.map((row) => [row.id, row.title]));

  return {
    items: rows.map((row) => ({
      id: row.id,
      conversationId: row.conversationId,
      conversationTitle: row.conversationId
        ? (titleById.get(row.conversationId) ?? null)
        : null,
      turnId: row.turnId,
      model: row.model,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      ttsChars: row.ttsChars,
      costMicros: row.costMicros,
      createdAt: row.createdAt.toISOString(),
    })),
    total: totalRows[0]?.total ?? 0,
    limit,
    offset,
  };
}
