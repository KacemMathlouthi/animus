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
