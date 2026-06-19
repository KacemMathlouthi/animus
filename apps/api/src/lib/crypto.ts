/** Symmetric encryption for secrets at rest (BYO provider keys).
 * AES-256-GCM with a server-held key from `ENCRYPTION_KEY`.
 * The output bundles the random IV and auth tag with the
 * ciphertext so a single column round-trips. */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getServerEnv } from "@animus/core/env";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

function getKey(): Buffer {
  const raw = getServerEnv().encryptionKey;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set — required to store provider keys. Generate one with `openssl rand -base64 32`."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes, base64-encoded.");
  }
  return key;
}

/** Encrypts `plaintext` into a self-contained
 * `iv.tag.ciphertext` string (each part base64). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

/** Reverses {@link encryptSecret}: splits the payload, then decrypts with the
 * same key + IV and verifies the auth tag. Throws if the payload is malformed
 * or the tag fails (tampering / wrong key). */
export function decryptSecret(payload: string): string {
  const [ivPart, tagPart, ctPart] = payload.split(".");
  if (!(ivPart && tagPart && ctPart)) {
    throw new Error("Malformed encrypted secret.");
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivPart, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctPart, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
