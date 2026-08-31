/** The Better Auth instance: sessions, cookies and OAuth, persisted to our
 * Postgres through the Drizzle adapter. `apps/api` mounts its handler. */

import { getServerEnv } from "@animus/core/env";
import { db, schema } from "@animus/db";
import { dash } from "@better-auth/infra";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { lastLoginMethod, magicLink } from "better-auth/plugins";
import { deliverMagicLink, magicLinkPageUrl } from "./email.ts";

const env = getServerEnv();
const githubId = env.githubClientId;
const githubSecret = env.githubClientSecret;
const googleId = env.googleClientId;
const googleSecret = env.googleClientSecret;
const infraApiKey = env.betterAuthApiKey;

const DAY = 60 * 60 * 24;

export const auth = betterAuth({
  appName: "animus",
  secret: env.betterAuthSecret,
  baseURL: env.betterAuthUrl,
  trustedOrigins: [env.webOrigin],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  session: {
    expiresIn: 30 * DAY,
    // Slide the expiry forward daily rather than on every request.
    updateAge: DAY,
    cookieCache: {
      // JWE so an intercepted cookie does not expose the session data.
      enabled: true,
      maxAge: 60,
      strategy: "jwe",
    },
  },

  // One person, many logins: the same email on Google and GitHub links to one
  // user instead of erroring. No trustedProviders — that would link even when
  // the provider reports the email unverified, which is an account-takeover path.
  account: {
    accountLinking: { enabled: true },
  },

  advanced: {
    // Without this the rate limiter resolves no IP and falls back to a single
    // bucket shared by every user, so one client can lock out sign-in for all.
    ipAddress: { ipAddressHeaders: env.clientIpHeaders },
    // The web and API sit on sibling hosts in prod, so the session cookie has
    // to be scoped to their shared parent. Same-site, so SameSite=Lax still
    // sends it; this is not the cross-site case.
    ...(env.cookieDomain
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: env.cookieDomain,
          },
        }
      : {}),
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
    magicLink({
      expiresIn: 60 * 5,
      // Hashed, so a DB breach cannot reveal usable links.
      storeToken: "hashed",
      // Links to the web app's confirm page rather than the verify endpoint:
      // inbox scanners prefetch URLs and would spend the single-use token.
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
    lastLoginMethod(),
    // No-op until BETTER_AUTH_API_KEY is set.
    ...(infraApiKey ? [dash({ apiKey: infraApiKey })] : []),
  ],
});
