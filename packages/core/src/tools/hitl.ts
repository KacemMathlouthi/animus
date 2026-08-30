import { z } from "zod";

/** askUserQuestion — ask the user to pick option(s) and/or answer free-form. */
export const AskUserQuestionInputSchema = z.object({
  question: z.string(),
  options: z
    .array(z.object({ label: z.string(), description: z.string().optional() }))
    .min(1)
    .refine(
      (options) =>
        new Set(options.map((option) => option.label)).size === options.length,
      "Option labels must be unique"
    ),
  /** Allow selecting more than one option. */
  allowMultiple: z.boolean().optional(),
  /** Allow a free-form written answer in addition to the options. */
  allowFreeText: z.boolean().optional(),
});
export type AskUserQuestionInput = z.infer<typeof AskUserQuestionInputSchema>;

export const AskUserQuestionOutputSchema = z.object({
  /** Labels of the chosen options (one entry unless allowMultiple). */
  selected: z.array(z.string()),
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
  feedback: z.string().optional(),
});
export type FinalizeVideoPlanOutput = z.infer<
  typeof FinalizeVideoPlanOutputSchema
>;
