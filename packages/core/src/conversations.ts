import { z } from "zod";

export const CONVERSATION_TITLE_STATUSES = [
  "pending",
  "generated",
  "manual",
] as const;

export const ConversationTitleStatusSchema = z.enum(
  CONVERSATION_TITLE_STATUSES
);
export type ConversationTitleStatus =
  (typeof CONVERSATION_TITLE_STATUSES)[number];

export const ConversationSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  titleStatus: ConversationTitleStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  lastMessageAt: z.string().nullable(),
});
export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;

export const ConversationListResponseSchema = z.object({
  conversations: z.array(ConversationSummarySchema),
});
export type ConversationListResponse = z.infer<
  typeof ConversationListResponseSchema
>;

export const RenameConversationInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
});
export type RenameConversationInput = z.infer<
  typeof RenameConversationInputSchema
>;

export const CreateConversationResponseSchema = z.object({
  conversation: ConversationSummarySchema,
});
export type CreateConversationResponse = z.infer<
  typeof CreateConversationResponseSchema
>;
