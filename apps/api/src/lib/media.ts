/** v0.1 media storage: rendered videos are written to a local directory and
 * served back by the media route. This is the `SaveVideo` the agent's renderScene
 * tool calls. The seam is deliberate — swapping this for Cloudflare R2 later is a
 * single-file change that doesn't touch the agent or its tools. */

import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getServerEnv } from "@animus/core/env";

const MEDIA_ROOT = join(tmpdir(), "animus-media");
const UNSAFE_NAME_CHARS = /[^a-zA-Z0-9_-]/g;
const TRAILING_SLASH = /\/$/;

export function mediaRoot(): string {
  return MEDIA_ROOT;
}

function safeName(value: string): string {
  return value.replace(UNSAFE_NAME_CHARS, "_").slice(0, 60) || "scene";
}

/** Persist a rendered mp4 and return an absolute URL the web can embed. */
export async function saveVideo(input: {
  bytes: Uint8Array;
  conversationId: string;
  scene: string;
}): Promise<string> {
  const conversationId = safeName(input.conversationId);
  const file = `${safeName(input.scene)}-${crypto.randomUUID().slice(0, 8)}.mp4`;
  const dir = join(MEDIA_ROOT, conversationId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, file), input.bytes);

  const base = getServerEnv().apiPublicUrl.replace(TRAILING_SLASH, "");
  return `${base}/api/media/${conversationId}/${file}`;
}
