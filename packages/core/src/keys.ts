/** Contracts for the BYO provider key. The input schema validates what the
 * client sends to save a key; the preview is all the API ever sends back —
 * the plaintext key never leaves the server. */

import { z } from "zod";
import { type ProviderId, ProviderIdSchema } from "./providers.ts";

export const ProviderKeyInputSchema = z.object({
  provider: ProviderIdSchema,
  key: z.string().min(1).max(512),
});
export type ProviderKeyInput = z.infer<typeof ProviderKeyInputSchema>;

/** Masked key returned to the client — provider plus the last 4 chars. */
export interface ProviderKeyPreview {
  last4: string;
  provider: ProviderId;
}
