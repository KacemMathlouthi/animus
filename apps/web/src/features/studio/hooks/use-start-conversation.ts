/** Starts a new conversation from a prompt and navigates into it — the studio's
 * "new video" entry, shared by the studio's empty state and the landing hero.
 * The prompt rides in router state; the studio auto-sends it on arrival. */

import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import {
  createConversation,
  notifyConversationsChanged,
} from "@/lib/conversations";

interface StartConversation {
  creating: boolean;
  error: string | null;
  start: (text: string) => void;
}

export function useStartConversation(): StartConversation {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    (text: string) => {
      if (!text.trim()) {
        return;
      }
      setCreating(true);
      setError(null);
      void createConversation()
        .then((conversation) => {
          notifyConversationsChanged();
          navigate(`/studio/c/${conversation.id}`, {
            state: { prompt: text },
          });
        })
        .catch(() => {
          setError("Could not create a conversation. Try again.");
          setCreating(false);
        });
    },
    [navigate]
  );

  return { start, creating, error };
}
