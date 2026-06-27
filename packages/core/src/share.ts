import { z } from "zod";

/** Shape of an R2 video object key: `videos/<conversationId>/<file>.mp4`. Shared
 * here so the share-create input is validated the same way the API mints keys. */
export const VideoKeySchema = z
  .string()
  .regex(/^videos\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.mp4$/, "Invalid video key");

/** Request body for creating a permanent, unlisted public share of one video. */
export const CreateShareInputSchema = z.object({
  videoKey: VideoKeySchema,
});
export type CreateShareInput = z.infer<typeof CreateShareInputSchema>;

/** Response from creating (or re-fetching) a share — the public slug to embed
 * in the share URL. The web builds the URL as `<origin>/v/<token>`. */
export const CreateShareResponseSchema = z.object({
  token: z.string().min(1),
});
export type CreateShareResponse = z.infer<typeof CreateShareResponseSchema>;

/** Response from the public share-resolve route: enough to render the page
 * without auth — the title plus freshly minted presigned URLs for streaming and
 * for downloading (the latter forces a save with a friendly filename). */
export const PublicShareResponseSchema = z.object({
  title: z.string().min(1),
  videoUrl: z.string().url(),
  downloadUrl: z.string().url(),
});
export type PublicShareResponse = z.infer<typeof PublicShareResponseSchema>;
