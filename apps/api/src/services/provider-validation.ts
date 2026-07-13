/** Validate a BYO provider key with a single, cheap, read-only request before we
 * store it — so a typo surfaces immediately instead of failing mid-render. Each
 * check hits the provider's lightweight "list/whoami" endpoint and treats a 2xx
 * as valid; any non-2xx or network/timeout error is treated as invalid (the user
 * can simply re-enter the key). */

import type { ProviderId } from "@animus/core";
import { logger } from "../lib/logger.ts";

const VALIDATION_TIMEOUT_MS = 10_000;

/** GET `url` with `headers` and report whether the response was 2xx. Never
 * throws — a thrown fetch (DNS, timeout, offline) counts as invalid. */
async function isOk(
  url: string,
  headers: Record<string, string>
): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(VALIDATION_TIMEOUT_MS),
    });
    return res.ok;
  } catch (error) {
    // Deliberately log neither the URL nor the raw error: Google's validation
    // endpoint carries the plaintext key in its query string, and runtime
    // fetch errors can echo the full URL back. Origin+path plus the error name
    // (TimeoutError vs TypeError) is enough to diagnose.
    const { origin, pathname } = new URL(url);
    logger.warn(
      {
        endpoint: `${origin}${pathname}`,
        reason: error instanceof Error ? error.name : "unknown",
      },
      "provider key validation request failed"
    );
    return false;
  }
}

/** Validate an LLM provider key. Exhaustive over the supported providers. */
export function validateLlmKey(
  provider: ProviderId,
  apiKey: string
): Promise<boolean> {
  switch (provider) {
    case "anthropic":
      return isOk("https://api.anthropic.com/v1/models", {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      });
    case "openai":
      return isOk("https://api.openai.com/v1/models", {
        authorization: `Bearer ${apiKey}`,
      });
    case "google":
      return isOk(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
        {}
      );
    default: {
      const exhaustive: never = provider;
      throw new Error(`Unsupported LLM provider: ${String(exhaustive)}`);
    }
  }
}

/** Validate an ElevenLabs key against the read-only user endpoint. */
export function validateTtsKey(apiKey: string): Promise<boolean> {
  return isOk("https://api.elevenlabs.io/v1/user", { "xi-api-key": apiKey });
}
