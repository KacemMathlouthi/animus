/** Contracts for the credit balance the API exposes at `GET /api/credits` and
 * the shared error code the chat endpoint returns when a metered turn is blocked
 * for insufficient balance. PURE — safe to import from the web. */

import { z } from "zod";

/** Error `code` returned (HTTP 402) when a metered user has no balance left. The
 * web keys its depletion modal off this exact string. */
export const OUT_OF_CREDITS = "OUT_OF_CREDITS" as const;

export const CreditsBalanceSchema = z.object({
  /** Remaining balance in micro-USD. May be slightly negative after a turn
   * overshoots (balance-only enforcement does not kill a turn mid-flight). */
  balanceMicros: z.number().int(),
  /** The original free grant in micro-USD — the gauge denominator. */
  grantMicros: z.number().int(),
});
export type CreditsBalance = z.infer<typeof CreditsBalanceSchema>;

/** One settled turn in the usage ledger (`GET /api/credits/usage`). */
export const UsageEventItemSchema = z.object({
  id: z.string(),
  /** The conversation the turn belonged to; kept after deletion. */
  conversationId: z.string().nullable(),
  /** Title when the conversation still exists; null once it's deleted. */
  conversationTitle: z.string().nullable(),
  /** The per-request turn id the settlement was keyed on. */
  turnId: z.string(),
  /** Metered LLM model id; null when the LLM ran on the user's own key. */
  model: z.string().nullable(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  ttsChars: z.number().int(),
  /** Total settled cost of the turn in micro-USD. */
  costMicros: z.number().int(),
  /** ISO timestamp of the settlement. */
  createdAt: z.string(),
});
export type UsageEventItem = z.infer<typeof UsageEventItemSchema>;

/** Paginated usage ledger page, newest first. */
export const UsageListSchema = z.object({
  items: z.array(UsageEventItemSchema),
  /** Total ledger rows for the user (for page controls). */
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export type UsageList = z.infer<typeof UsageListSchema>;
