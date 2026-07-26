/** The signed-in user's credit balance. Fetches `/api/credits` on mount and
 * refetches whenever a turn changes it (via the `credits-changed` event), so the
 * header gauge and settings both stay live. Mirrors the app's other event-bus
 * hooks (see use-conversation-list). */

import type { CreditsBalance } from "@animus/core";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { onCreditsChanged } from "@/lib/credit-events";

interface UseCredits {
  balance: CreditsBalance | null;
  /** Fraction of the original grant remaining, clamped to 0–1 (gauge value). */
  fraction: number;
  loading: boolean;
  refresh: () => void;
}

export function useCredits(): UseCredits {
  const [balance, setBalance] = useState<CreditsBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    apiFetch<CreditsBalance>("/api/credits")
      .then(setBalance)
      .catch(() => {
        // Leave the last known balance; the gauge simply won't update.
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    return onCreditsChanged(load);
  }, [load]);

  const fraction =
    balance && balance.grantMicros > 0
      ? Math.max(0, Math.min(1, balance.balanceMicros / balance.grantMicros))
      : 1;

  return { balance, loading, fraction, refresh: load };
}
