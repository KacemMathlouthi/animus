import { z } from "zod";

/** askUserQuestion — ask the user to pick option(s) and/or answer free-form. */
export const AskUserQuestionInputSchema = z.object({
  question: z
    .string()
    .describe("The question to put to the user, phrased as a concrete fork."),
  options: z
    .array(
      z.object({
        label: z.string().describe("Short, unique label the user clicks."),
        description: z
          .string()
          .optional()
          .describe("One line on what choosing this option implies."),
      })
    )
    .min(1)
    .refine(
      (options) =>
        new Set(options.map((option) => option.label)).size === options.length,
      "Option labels must be unique"
    )
    .describe("2-4 distinct answers. Labels must be unique."),
  allowMultiple: z
    .boolean()
    .optional()
    .describe("Let the user select more than one option."),
  allowFreeText: z
    .boolean()
    .optional()
    .describe(
      "Let the user type their own answer in addition to the options. Defaults to allowed."
    ),
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
  title: z.string().describe("Working title of the video."),
  scenes: z
    .array(
      z.object({
        title: z.string().describe("Short name of the scene."),
        description: z
          .string()
          .describe(
            "What the scene shows and says, detailed enough to build it from this alone."
          ),
      })
    )
    .min(1)
    .describe("The scenes in playback order."),
});
export type VideoPlan = z.infer<typeof VideoPlanSchema>;

export const FinalizeVideoPlanOutputSchema = z.object({
  approved: z.boolean(),
  feedback: z.string().optional(),
});
export type FinalizeVideoPlanOutput = z.infer<
  typeof FinalizeVideoPlanOutputSchema
>;
