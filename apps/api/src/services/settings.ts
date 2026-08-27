import type { LlmKey } from "@animus/agent";
import type {
  GenerationSettings,
  KeyKind,
  LlmKeyPreview,
  ProviderId,
  ProviderKeyInput,
  ProviderKeyPreview,
  ProviderKeys,
  TtsKeyPreview,
} from "@animus/core";
import {
  DEFAULT_MUSIC_TRACK_ID,
  DEFAULT_VOICE_ID,
  GENERATION_DEFAULTS,
  GenerationSettingsSchema,
  TTS_KEY_PROVIDER,
} from "@animus/core";
import { and, db, eq, providerKey, userSettings } from "@animus/db";
import { decryptSecret, encryptSecret } from "../lib/crypto.ts";
import { logger } from "../lib/logger.ts";

/** An undecryptable row (rotated key, corrupt ciphertext) reads as no key, so
 * the turn falls back to the metered path instead of 500ing. */
function tryDecrypt(
  userId: string,
  kind: KeyKind,
  encrypted: string
): string | undefined {
  try {
    return decryptSecret(encrypted);
  } catch (error) {
    logger.warn(
      {
        userId,
        kind,
        reason: error instanceof Error ? error.message : "unknown",
      },
      "stored provider key could not be decrypted; treating as absent"
    );
    return;
  }
}

export async function getGenerationSettings(
  userId: string
): Promise<GenerationSettings | null> {
  const row = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });
  if (!row) {
    return null;
  }

  // Coalesce pre-backfill NULLs before validating: a drifted row leaking an
  // invalid shape used to make every settings save 400.
  const parsed = GenerationSettingsSchema.safeParse({
    videoTheme: row.videoTheme,
    backgroundMusic: row.backgroundMusic,
    musicTrack: row.musicTrack ?? DEFAULT_MUSIC_TRACK_ID,
    voiceId: row.voiceId ?? DEFAULT_VOICE_ID,
    font: row.font,
  });
  if (!parsed.success) {
    logger.warn(
      { userId, issues: parsed.error.issues },
      "stored generation settings are invalid; serving defaults"
    );
    return GENERATION_DEFAULTS;
  }
  return parsed.data;
}

export async function saveGenerationSettings({
  userId,
  settings,
}: {
  userId: string;
  settings: GenerationSettings;
}) {
  const values = { ...settings, userId };
  await db
    .insert(userSettings)
    .values(values)
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { ...settings, updatedAt: new Date() },
    });

  return settings;
}

type ProviderKeyRow = typeof providerKey.$inferSelect;

function toLlmPreview(row: ProviderKeyRow): LlmKeyPreview {
  return {
    kind: "llm",
    provider: row.provider as ProviderId,
    model: row.model ?? "",
    last4: row.keyLast4,
  };
}

function toTtsPreview(row: ProviderKeyRow): TtsKeyPreview {
  return { kind: "tts", provider: TTS_KEY_PROVIDER, last4: row.keyLast4 };
}

export async function getProviderKeys(userId: string): Promise<ProviderKeys> {
  const rows = await db.query.providerKey.findMany({
    where: eq(providerKey.userId, userId),
  });
  const llm = rows.find((r) => r.kind === "llm");
  const tts = rows.find((r) => r.kind === "tts");
  return {
    llm: llm ? toLlmPreview(llm) : null,
    tts: tts ? toTtsPreview(tts) : null,
  };
}

export async function saveProviderKey({
  userId,
  input,
}: {
  userId: string;
  input: ProviderKeyInput;
}): Promise<ProviderKeyPreview> {
  const trimmed = input.key.trim();
  const provider = input.kind === "llm" ? input.provider : TTS_KEY_PROVIDER;
  const model = input.kind === "llm" ? input.model : null;
  const keyLast4 = trimmed.slice(-4);

  await db
    .insert(providerKey)
    .values({
      userId,
      kind: input.kind,
      provider,
      model,
      keyEncrypted: encryptSecret(trimmed),
      keyLast4,
    })
    .onConflictDoUpdate({
      target: [providerKey.userId, providerKey.kind],
      set: {
        provider,
        model,
        keyEncrypted: encryptSecret(trimmed),
        keyLast4,
        updatedAt: new Date(),
      },
    });

  return input.kind === "llm"
    ? {
        kind: "llm",
        provider: input.provider,
        model: input.model,
        last4: keyLast4,
      }
    : { kind: "tts", provider: TTS_KEY_PROVIDER, last4: keyLast4 };
}

export async function deleteProviderKey(
  userId: string,
  kind: KeyKind
): Promise<void> {
  await db
    .delete(providerKey)
    .where(and(eq(providerKey.userId, userId), eq(providerKey.kind, kind)));
}

/** Undefined when the user runs on our Bedrock model. */
export async function getDecryptedLlmKey(
  userId: string
): Promise<LlmKey | undefined> {
  const row = await db.query.providerKey.findFirst({
    where: and(eq(providerKey.userId, userId), eq(providerKey.kind, "llm")),
  });
  if (!row?.model) {
    return;
  }
  const apiKey = tryDecrypt(userId, "llm", row.keyEncrypted);
  if (!apiKey) {
    return;
  }
  return {
    provider: row.provider as ProviderId,
    model: row.model,
    apiKey,
  };
}

/** Undefined when narration runs on our key. */
export async function getDecryptedTtsKey(
  userId: string
): Promise<string | undefined> {
  const row = await db.query.providerKey.findFirst({
    where: and(eq(providerKey.userId, userId), eq(providerKey.kind, "tts")),
  });
  return row ? tryDecrypt(userId, "tts", row.keyEncrypted) : undefined;
}
