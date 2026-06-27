/** Public video shares: a permanent, unlisted link to a single rendered video.
 * Creation is owner-gated by the route; resolution by token is public. One share
 * per video key (DB unique), so re-sharing the same render returns the same
 * token rather than minting a new link. */

import { db, eq, videoShare } from "@animus/db";

type VideoShareRow = typeof videoShare.$inferSelect;

/** An unguessable URL-safe slug for the public share link. */
function newToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/** Create a share for a video, or return the existing one if it was already
 * shared (idempotent on `videoKey`). The unique index makes this race-safe:
 * the insert is a no-op on conflict and we read back the surviving row. */
export async function createShare(input: {
  conversationId: string;
  userId: string;
  videoKey: string;
  title: string;
}): Promise<{ token: string }> {
  await db
    .insert(videoShare)
    .values({
      token: newToken(),
      conversationId: input.conversationId,
      userId: input.userId,
      videoKey: input.videoKey,
      title: input.title,
    })
    .onConflictDoNothing({ target: videoShare.videoKey });

  const row = await db.query.videoShare.findFirst({
    columns: { token: true },
    where: eq(videoShare.videoKey, input.videoKey),
  });
  if (!row) {
    throw new Error("share row missing after insert");
  }
  return { token: row.token };
}

/** Resolve a public share token to its row, or null if unknown. */
export function getShareByToken(token: string): Promise<VideoShareRow | null> {
  return db.query.videoShare
    .findFirst({ where: eq(videoShare.token, token) })
    .then((row) => row ?? null);
}
