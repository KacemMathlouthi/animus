import type { GenerationSettings, ProviderKeyInput } from "@animus/core";
import { db, eq, providerKey, userSettings } from "@animus/db";
import { encryptSecret } from "../lib/crypto.ts";

export async function getGenerationSettings(userId: string) {
  const row = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });

  return row
    ? {
        videoTheme: row.videoTheme,
        backgroundMusic: row.backgroundMusic,
        musicTrack: row.musicTrack,
        voiceId: row.voiceId,
        font: row.font,
      }
    : null;
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

export async function getProviderKey(userId: string) {
  const row = await db.query.providerKey.findFirst({
    where: eq(providerKey.userId, userId),
  });

  return row ? { provider: row.provider, last4: row.keyLast4 } : null;
}

export async function saveProviderKey({
  userId,
  input,
}: {
  userId: string;
  input: ProviderKeyInput;
}) {
  const trimmed = input.key.trim();
  const values = {
    userId,
    provider: input.provider,
    keyEncrypted: encryptSecret(trimmed),
    keyLast4: trimmed.slice(-4),
  };

  await db
    .insert(providerKey)
    .values(values)
    .onConflictDoUpdate({
      target: providerKey.userId,
      set: {
        provider: values.provider,
        keyEncrypted: values.keyEncrypted,
        keyLast4: values.keyLast4,
        updatedAt: new Date(),
      },
    });

  return { provider: values.provider, last4: values.keyLast4 };
}

export async function deleteProviderKey(userId: string) {
  await db.delete(providerKey).where(eq(providerKey.userId, userId));
}
