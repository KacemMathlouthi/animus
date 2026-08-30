import { useChat } from "@ai-sdk/react";
import {
  type ChatStatus,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AnimusUIMessage,
  RespondToTool,
  StudioPhase,
} from "@/features/studio/types";
import { chatTransport } from "@/lib/chat";
import { notifyCreditsChanged } from "@/lib/credit-events";

interface StudioChat {
  /** The error that ended the last turn, if it ended in one. */
  error?: Error;
  messages: AnimusUIMessage[];
  phase: StudioPhase;
  respondToTool: RespondToTool;
  /** Re-runs the failed turn (regenerates from the last user message). */
  retry: () => void;
  send: (text: string) => void;
  status: ChatStatus;
  stop: () => void;
  /** Undefined until a render succeeds; the panel animates while it is absent. */
  videoKey?: string;
}

/** The studio's chat session, keyed by chatId. HITL calls pause the agent:
 * `respondToTool` answers and `sendAutomaticallyWhen` resubmits. */
export function useStudioChat({
  chatId,
  initialPrompt,
  initialMessages,
  onConversationUpdated,
}: {
  chatId: string;
  initialPrompt?: string;
  initialMessages?: AnimusUIMessage[];
  onConversationUpdated?: () => void;
}): StudioChat {
  const {
    messages,
    sendMessage,
    status,
    addToolOutput,
    stop,
    error,
    regenerate,
  } = useChat<AnimusUIMessage>({
    id: chatId,
    messages: initialMessages,
    transport: chatTransport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: () => {
      onConversationUpdated?.();
      // A completed turn may have drawn the balance down.
      notifyCreditsChanged();
    },
  });

  // Router state keeps the prompt across a hard refresh, so without capturing
  // whether the snapshot already had messages a refresh duplicates the turn.
  const autoSent = useRef(false);
  const hadInitialMessages = useRef((initialMessages?.length ?? 0) > 0).current;
  const [initialSendFailed, setInitialSendFailed] = useState(false);
  useEffect(() => {
    if (initialPrompt && !(autoSent.current || hadInitialMessages)) {
      autoSent.current = true;
      setInitialSendFailed(false);
      void sendMessage({ text: initialPrompt }).catch(() => {
        autoSent.current = false;
        setInitialSendFailed(true);
      });
    }
  }, [initialPrompt, hadInitialMessages, sendMessage]);

  const send = useCallback(
    (text: string) => {
      void sendMessage({ text });
    },
    [sendMessage]
  );

  const respondToTool = useCallback<RespondToTool>(
    (tool, toolCallId, output) => {
      // Tool and output correspond at every call site; the union widening is
      // the only thing the signature cannot prove.
      addToolOutput({ tool, toolCallId, output } as never);
    },
    [addToolOutput]
  );

  const hasMessages = messages.length > 0;
  const hasAssistant = messages.some((message) => message.role === "assistant");
  const working = status === "submitted" || status === "streaming";

  let phase: StudioPhase;
  if (
    !hasAssistant &&
    (working || (initialPrompt != null && !hasMessages && !initialSendFailed))
  ) {
    phase = "loading";
  } else if (hasMessages) {
    phase = "chat";
  } else {
    phase = "idle";
  }

  let videoKey: string | undefined;
  for (const message of messages) {
    for (const part of message.parts) {
      if (
        part.type === "tool-renderScene" &&
        part.state === "output-available" &&
        part.output.ok &&
        part.output.videoKey
      ) {
        videoKey = part.output.videoKey;
      }
    }
  }

  const retry = useCallback(() => {
    void regenerate();
  }, [regenerate]);

  return {
    messages,
    status,
    phase,
    videoKey,
    send,
    stop,
    respondToTool,
    error,
    retry,
  };
}
