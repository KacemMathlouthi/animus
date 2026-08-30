/** Money is integer micro-USD throughout. Settlement is idempotent on the
 * per-request turn id, so a turn is never charged twice. Enforcement is
 * balance-only: a running turn is never killed and may end negative. */

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

/** Past the cap, new accounts seed at $0 instead of the free grant. */
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

/** Seeds the row on first read. */
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
  // Guards the race where two concurrent turns both seed.
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
  /** Subset of `inputTokens`, priced at the cache-read multiplier. */
  cacheReadTokens?: number;
  /** Subset of `inputTokens`, priced at the cache-write multiplier. */
  cacheWriteTokens?: number;
  conversationId: string | null;
  inputTokens: number;
  /** True when the LLM ran on our key rather than the user's own. */
  isLlmMetered: boolean;
  /** True when TTS ran on our key rather than the user's own. */
  isTtsMetered: boolean;
  model: string;
  outputTokens: number;
  ttsChars: number;
  /** The idempotency key: one settlement per request. */
  turnId: string;
  userId: string;
}

/** Returns the micro-USD charged. A no-op when nothing is billable or the turn
 * was already settled. */
export async function settleUsage(input: SettleUsageInput): Promise<number> {
  const llmCost = input.isLlmMetered
    ? estimateLlmCostMicros({
        model: input.model,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        cacheReadTokens: input.cacheReadTokens,
        cacheWriteTokens: input.cacheWriteTokens,
      })
    : 0;
  const ttsCost = input.isTtsMetered ? ttsCostMicros(input.ttsChars) : 0;
  const costMicros = llmCost + ttsCost;

  if (costMicros <= 0) {
    return 0;
  }

  // The ledger insert (whose unique turn_id is the idempotency guard) and the
  // debit must commit together: split statements once left a row without its
  // debit on a crash, which permanently blocked the retry.
  return await db.transaction(async (tx) => {
    const inserted = await tx
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

    await tx
      .update(userCredits)
      .set({
        balanceMicros: sqlExpr`${userCredits.balanceMicros} - ${costMicros}`,
        updatedAt: new Date(),
      })
      .where(eq(userCredits.userId, input.userId));

    return costMicros;
  });
}

export interface ListUsageInput {
  limit: number;
  offset: number;
  userId: string;
}

/** Newest first. Titles attach only where the conversation still exists: the
 * ledger keeps the plain id after deletion so cost history survives. */
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
