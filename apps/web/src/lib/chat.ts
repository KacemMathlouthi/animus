/** Transport for the studio chat. Points useChat at the API's streaming
 * /api/chat endpoint and sends the session cookie so the request is
 * authenticated (the endpoint is auth-guarded). */

import { DefaultChatTransport } from "ai";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export const chatTransport = new DefaultChatTransport({
	api: `${API_URL}/api/chat`,
	credentials: "include",
});
