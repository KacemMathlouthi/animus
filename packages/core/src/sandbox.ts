/** Sandbox-provisioning error contract. Pure. */

/** Sent as the `code` on a 503 when the sandbox host refuses a sandbox
 * (storage quota, rate limit, unreachable) — none of which are the user's
 * fault or a bug in the turn. The studio shows the accompanying message; this
 * distinguishes the cause for anything that needs to branch on it. */
export const SANDBOX_UNAVAILABLE = "SANDBOX_UNAVAILABLE" as const;
