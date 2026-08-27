/** Video storage on Cloudflare R2. Conversations store the object KEY, never a
 * URL: re-signing on demand is what keeps a replayed conversation working. */

import { getServerEnv } from "@animus/core/env";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** The web re-signs on load, so a viewing session's worth is plenty. */
const SIGNED_URL_TTL_SEC = 3600;
const DELETE_BATCH = 1000;
const UNSAFE_NAME_CHARS = /[^a-zA-Z0-9_-]/g;
const MEDIA_PREFIX = "videos";
const MEDIA_KEY = /^videos\/([a-zA-Z0-9_-]+)\/[a-zA-Z0-9_-]+\.mp4$/;
/** Ids mirror the web's MUSIC_TRACKS. All public domain; provenance is in
 * apps/api/assets/MUSIC_LICENSES.md. */
const MUSIC_TRACK_KEYS: Record<string, string> = {
  ambient: "music/Ambient.mp3",
  upbeat: "music/Upbeat.mp3",
  cinematic: "music/Cinematic.mp3",
};
/** Used when a stored or legacy track id is not in the catalog. */
const FALLBACK_MUSIC_KEY = "music/Ambient.mp3";

/** Guards the public preview route. */
export function isMusicTrackId(id: string): boolean {
  return Object.hasOwn(MUSIC_TRACK_KEYS, id);
}

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    const env = getServerEnv();
    client = new S3Client({
      region: "auto",
      endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.r2AccessKeyId,
        secretAccessKey: env.r2SecretAccessKey,
      },
    });
  }
  return client;
}

function bucket(): string {
  return getServerEnv().r2Bucket;
}

function safeName(value: string): string {
  return value.replace(UNSAFE_NAME_CHARS, "_").slice(0, 60) || "scene";
}

function conversationPrefix(conversationId: string): string {
  return `${MEDIA_PREFIX}/${safeName(conversationId)}/`;
}

/** Null when the key is malformed. */
export function mediaKeyConversationId(key: string): string | null {
  return key.match(MEDIA_KEY)?.[1] ?? null;
}

/** Returns the object key, not a URL. */
export async function saveVideo(input: {
  bytes: Uint8Array;
  conversationId: string;
  scene: string;
}): Promise<string> {
  const file = `${safeName(input.scene)}-${crypto.randomUUID().slice(0, 8)}.mp4`;
  const key = `${conversationPrefix(input.conversationId)}${file}`;
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: input.bytes,
      ContentType: "video/mp4",
    })
  );
  return key;
}

/** Lets the sandbox pull the track straight from R2. */
export function backgroundMusicUrl(trackId: string): Promise<string> {
  return signMediaUrl(MUSIC_TRACK_KEYS[trackId] ?? FALLBACK_MUSIC_KEY);
}

export function signMediaUrl(key: string): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
    { expiresIn: SIGNED_URL_TTL_SEC }
  );
}

/** R2 echoes `ResponseContentDisposition`, so the browser saves the mp4
 * straight from R2 under a friendly name. */
export function signDownloadUrl(
  key: string,
  filename: string
): Promise<string> {
  const safe = safeName(filename) || "video";
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentDisposition: `attachment; filename="${safe}.mp4"`,
    }),
    { expiresIn: SIGNED_URL_TTL_SEC }
  );
}

/** Best-effort and paginated. */
export async function deleteConversationMedia(
  conversationId: string
): Promise<void> {
  const s3 = getClient();
  const Bucket = bucket();
  const Prefix = conversationPrefix(conversationId);
  let continuationToken: string | undefined;

  do {
    const listed = await s3.send(
      new ListObjectsV2Command({
        Bucket,
        Prefix,
        ContinuationToken: continuationToken,
        MaxKeys: DELETE_BATCH,
      })
    );
    const keys = (listed.Contents ?? [])
      .map((object) => object.Key)
      .filter((key): key is string => Boolean(key));
    if (keys.length > 0) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
        })
      );
    }
    continuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined;
  } while (continuationToken);
}
