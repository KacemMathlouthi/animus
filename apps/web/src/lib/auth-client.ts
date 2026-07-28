/** Better Auth browser client. Talks to the API's /api/auth/* routes (with
 * credentials, so the session cookie rides along). The exported hooks/helpers
 * are what the UI uses: useSession() for reactive auth state, signIn/signOut
 * for actions. */

import {
  lastLoginMethodClient,
  magicLinkClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8787",
  plugins: [magicLinkClient(), lastLoginMethodClient()],
});

export const { signIn, signOut, useSession, getLastUsedLoginMethod } =
  authClient;
