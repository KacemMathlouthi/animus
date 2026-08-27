// biome-ignore lint/performance/noBarrelFile: this is the package's public entry, not an internal re-export
export { auth } from "./auth.ts";

import type { auth } from "./auth.ts";

/** The shape Better Auth resolves for a logged-in request.
 * Inferred from the config, so it stays in sync automatically. */
export type AuthSession = typeof auth.$Infer.Session;
export type User = AuthSession["user"];
export type Session = AuthSession["session"];
