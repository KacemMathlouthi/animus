/** Contracts for the agent's interactive (human-in-the-loop) tools. These tools
 * have no server `execute` — the agent emits the tool call, the web renders
 * custom UI, and the user's answer is sent back as the tool output. The agent
 * defines the tools from these input schemas; the web renders + validates from
 * the same shapes, so both sides agree. */

import { z } from "zod";

/** askUserQuestion — ask the user to pick option(s) and/or answer free-form. */
export const AskUserQuestionInputSchema = z.object({
  question: z.string(),
  options: z
    .array(z.object({ label: z.string(), description: z.string().optional() }))
    .min(1),
  /** Allow selecting more than one option. */
  allowMultiple: z.boolean().optional(),
  /** Allow a free-form written answer in addition to the options. */
  allowFreeText: z.boolean().optional(),
});
export type AskUserQuestionInput = z.infer<typeof AskUserQuestionInputSchema>;

export const AskUserQuestionOutputSchema = z.object({
  /** Labels of the chosen options (one entry unless allowMultiple). */
  selected: z.array(z.string()),
  /** The user's free-form answer, if any. */
  freeText: z.string().optional(),
});
export type AskUserQuestionOutput = z.infer<typeof AskUserQuestionOutputSchema>;

/** finalizeVideoPlan — the agent's proposed plan, awaiting the user's approval. */
export const VideoPlanSchema = z.object({
  title: z.string(),
  scenes: z
    .array(z.object({ title: z.string(), description: z.string() }))
    .min(1),
});
export type VideoPlan = z.infer<typeof VideoPlanSchema>;

export const FinalizeVideoPlanOutputSchema = z.object({
  approved: z.boolean(),
  /** Requested changes when not approved. */
  feedback: z.string().optional(),
});
export type FinalizeVideoPlanOutput = z.infer<
  typeof FinalizeVideoPlanOutputSchema
>;
