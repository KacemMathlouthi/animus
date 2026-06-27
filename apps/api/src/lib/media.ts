/** Media storage on Cloudflare R2 (S3-compatible). Rendered videos are uploaded
 * here by the agent's renderScene tool; the browser streams them straight from
 * R2 via short-lived presigned URLs minted by the media route. The renderScene
 * output stores only the object KEY, so a saved conversation keeps working on
 * replay (we re-sign on demand rather than baking an expiring URL into it). */

import { getServerEnv } from "@animus/core/env";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** How long a presigned playback URL is valid. The web re-signs on load, so a
 * window comfortably longer than a viewing session is plenty. */
const SIGNED_URL_TTL_SEC = 3600;
/** R2 delete-objects accepts up to 1000 keys per request. */
const DELETE_BATCH = 1000;
const UNSAFE_NAME_CHARS = /[^a-zA-Z0-9_-]/g;
const MEDIA_PREFIX = "videos";
/** videos/<conversationId>/<file>.mp4 — pins the shape we mint and accept. */
const MEDIA_KEY = /^videos\/([a-zA-Z0-9_-]+)\/[a-zA-Z0-9_-]+\.mp4$/;
/** Fixed object key for the background track muxed under every render. Hardcoded
 * for now; a user-configurable key is a later iteration. */
const MUSIC_KEY = "music/The_Merchants_Of_Death.mp3";

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

/** The object key prefix for a conversation's media — scopes listing/deletion. */
function conversationPrefix(conversationId: string): string {
  return `${MEDIA_PREFIX}/${safeName(conversationId)}/`;
}

/** The conversation id a well-formed media key belongs to, or null if malformed. */
export function mediaKeyConversationId(key: string): string | null {
  return key.match(MEDIA_KEY)?.[1] ?? null;
}

/** Persist a rendered mp4 to R2 and return its object key (NOT a URL). */
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

/** Presigned GET URL for the background track, so the sandbox can download it
 * straight from R2 (no byte round-trip through the API). If the object is
 * absent the download simply fails and renderScene delivers a silent video. */
export function backgroundMusicUrl(): Promise<string> {
  return signMediaUrl(MUSIC_KEY);
}

/** Mint a short-lived presigned GET URL the browser can stream from directly. */
export function signMediaUrl(key: string): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
    { expiresIn: SIGNED_URL_TTL_SEC }
  );
}

/** Delete every object stored for a conversation (best-effort, paginated). */
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
