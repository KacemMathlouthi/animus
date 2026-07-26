/** Transport for the studio chat. Points useChat at the API's streaming
 * /api/chat endpoint and sends the session cookie so the request is
 * authenticated (the endpoint is auth-guarded). */

import { OUT_OF_CREDITS } from "@animus/core";
import { DefaultChatTransport } from "ai";
import { ApiError } from "./api";
import { notifyCreditsChanged, notifyOutOfCredits } from "./credit-events";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

/** Intercept the credit gate: a 402 comes back as JSON, not an SSE stream, so
 * surface it as a typed error and signal the UI (open the depletion dialog,
 * refresh the balance) instead of letting it become an opaque stream error. */
const chatFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  if (response.status === 402) {
    const body = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
    } | null;
    if (body?.code === OUT_OF_CREDITS) {
      notifyOutOfCredits();
      notifyCreditsChanged();
    }
    throw new ApiError(402, body?.message ?? "Out of credits", body?.code);
  }
  return response;
};

export const chatTransport = new DefaultChatTransport({
  api: `${API_URL}/api/chat`,
  credentials: "include",
  fetch: chatFetch,
  prepareSendMessagesRequest({ id, messages }) {
    return {
      body: {
        id,
        message: messages.at(-1),
      },
    };
  },
});
