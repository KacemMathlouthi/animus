/**
 * The Better Auth instance — the single source of truth for authentication.
 * It owns the session/cookie logic, the OAuth flows, and reads/writes our
 * Postgres tables through the Drizzle adapter. `apps/api` mounts its handler.
 */

import { getServerEnv } from "@animus/core/env";
import { db, schema } from "@animus/db";
import { dash } from "@better-auth/infra";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { deliverMagicLink, magicLinkPageUrl } from "./email.ts";

const env = getServerEnv();
const githubId = env.githubClientId;
const githubSecret = env.githubClientSecret;
const googleId = env.googleClientId;
const googleSecret = env.googleClientSecret;
const infraApiKey = env.betterAuthApiKey;

const DAY = 60 * 60 * 24;

export const auth = betterAuth({
  // Product name (used by Better Auth in tokens, emails, and the dashboard).
  appName: "animus",
  // Signs session cookies.
  secret: env.betterAuthSecret,
  // Where this auth server lives, used to build OAuth callback URLs.
  baseURL: env.betterAuthUrl,
  // The web app's origin is allowed to drive auth (cookies + redirects).
  trustedOrigins: [env.webOrigin],
  // Persist everything in our Postgres via the Drizzle adapter.
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // How long a login lasts and how it is read on each request.
  session: {
    expiresIn: 30 * DAY,
    // Slide the expiry forward at most once a day instead of every request.
    updateAge: DAY,
    cookieCache: {
      // Cache the resolved session in a short-lived cookie, encrypted (JWE) so
      // the session data isn't readable if the cookie is intercepted.
      enabled: true,
      maxAge: 60,
      strategy: "jwe",
    },
  },

  // "One person, many logins": signing in with Google using the same email you
  // used for GitHub links both to the same user instead of erroring.
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["github", "google"],
    },
  },

  socialProviders: {
    ...(githubId && githubSecret
      ? { github: { clientId: githubId, clientSecret: githubSecret } }
      : {}),
    ...(googleId && googleSecret
      ? { google: { clientId: googleId, clientSecret: googleSecret } }
      : {}),
  },

  plugins: [
    // Passwordless email sign-in.
    magicLink({
      // The link is single-use and valid for five minutes.
      expiresIn: 60 * 5,
      // Store only a hash of the token, so a DB breach can't reveal usable links.
      storeToken: "hashed",
      // The email links to the web app's confirm page, not the verify endpoint
      // directly — inbox link scanners prefetch URLs and would consume the
      // single-use token before the human clicks (see magicLinkPageUrl).
      sendMagicLink: ({ email, url, token }) =>
        deliverMagicLink({
          email,
          url: magicLinkPageUrl({
            webOrigin: env.webOrigin,
            token,
            callbackURL:
              new URL(url).searchParams.get("callbackURL") ?? "/studio",
          }),
        }),
    }),
    // Managed dashboard + analytics. No-op until BETTER_AUTH_API_KEY is set.
    ...(infraApiKey ? [dash({ apiKey: infraApiKey })] : []),
  ],
});
