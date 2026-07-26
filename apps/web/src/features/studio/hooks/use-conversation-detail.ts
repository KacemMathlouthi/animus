import { useEffect, useState } from "react";
import { type ConversationDetail, getConversation } from "@/lib/conversations";

const TITLE_POLL_INTERVAL_MS = 2500;

interface ConversationDetailState {
  detail: ConversationDetail | null;
  error: boolean;
}

/** Load a conversation's detail and keep it fresh: it reloads whenever the
 * conversation set changes elsewhere (`animus:conversations-changed`) and polls
 * while the title is still being generated server-side. Returns `detail: null`
 * until the first load resolves. */
export function useConversationDetail(chatId: string): ConversationDetailState {
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void getConversation(chatId)
        .then((next) => {
          if (!cancelled) {
            setDetail(next);
            setError(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError(true);
          }
        });
    };

    load();
    window.addEventListener("animus:conversations-changed", load);
    return () => {
      cancelled = true;
      window.removeEventListener("animus:conversations-changed", load);
    };
  }, [chatId]);

  useEffect(() => {
    if (detail?.conversation.titleStatus !== "pending") {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void getConversation(chatId)
        .then((next) => {
          if (!cancelled) {
            setDetail(next);
          }
        })
        .catch(() => undefined);
    }, TITLE_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [chatId, detail]);

  return { detail, error };
}
