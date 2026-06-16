/** Shared Hono environment. Typing the app with this makes `c.get("user")` /
 * `c.get("session")` fully typed in every route and middleware. */

import type { Session, User } from "@animus/auth";

interface AppVariables {
  session: Session | null;
  user: User | null;
}

export interface AppEnv {
  Variables: AppVariables;
}
