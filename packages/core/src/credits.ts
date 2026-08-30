/** Credit-balance contracts and the out-of-credits error code. Pure. */

import { z } from "zod";

/** The web keys its depletion modal off this exact string. */
export const OUT_OF_CREDITS = "OUT_OF_CREDITS" as const;

export const CreditsBalanceSchema = z.object({
  /** May go slightly negative: a running turn is never killed. */
  balanceMicros: z.number().int(),
  grantMicros: z.number().int(),
});
export type CreditsBalance = z.infer<typeof CreditsBalanceSchema>;

export const UsageEventItemSchema = z.object({
  id: z.string(),
  /** Kept after the conversation is deleted. */
  conversationId: z.string().nullable(),
  conversationTitle: z.string().nullable(),
  turnId: z.string(),
  /** Null when the LLM ran on the user's own key. */
  model: z.string().nullable(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  ttsChars: z.number().int(),
  costMicros: z.number().int(),
  createdAt: z.string(),
});
export type UsageEventItem = z.infer<typeof UsageEventItemSchema>;

export const UsageListSchema = z.object({
  items: z.array(UsageEventItemSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export type UsageList = z.infer<typeof UsageListSchema>;
