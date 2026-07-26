/** Resolves an R2 media object key into a short-lived presigned playback URL by
 * calling the API's /api/media/sign endpoint. Results are cached module-wide and
 * refreshed before the presign expires, so the player and every chat card that
 * reference the same key share one request. */

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type CacheEntry = { url: string; fetchedAt: number };

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();
/** Re-sign before the server's 1h presign lapses. */
const REFRESH_MS = 50 * 60 * 1000;

function fresh(entry: CacheEntry | undefined): string | undefined {
  if (entry && Date.now() - entry.fetchedAt < REFRESH_MS) {
    return entry.url;
  }
  return;
}

function resolveKey(key: string): Promise<string> {
  const cached = fresh(cache.get(key));
  if (cached) {
    return Promise.resolve(cached);
  }
  const existing = inflight.get(key);
  if (existing) {
    return existing;
  }
  const pending = apiFetch<{ url: string }>(
    `/api/media/sign?key=${encodeURIComponent(key)}`
  )
    .then((res) => {
      cache.set(key, { url: res.url, fetchedAt: Date.now() });
      return res.url;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, pending);
  return pending;
}

export function useSignedMediaUrl(key: string | undefined): {
  url: string | undefined;
  error: boolean;
} {
  const [url, setUrl] = useState<string | undefined>(() =>
    key ? fresh(cache.get(key)) : undefined
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!key) {
      setUrl(undefined);
      setError(false);
      return;
    }
    let active = true;
    setUrl(fresh(cache.get(key)));
    setError(false);
    resolveKey(key)
      .then((resolved) => {
        if (active) {
          setUrl(resolved);
        }
      })
      .catch(() => {
        if (active) {
          setError(true);
        }
      });
    return () => {
      active = false;
    };
  }, [key]);

  return { url, error };
}
