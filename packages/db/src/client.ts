/** The Drizzle database client. Takes DATABASE_URL from the validated server
 * env (@animus/core/env — the single sanctioned source; runtime code never
 * reads process.env directly) and binds the full schema so queries are fully
 * typed (db.query.user, etc.). */

import { getServerEnv } from "@animus/core/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  account,
  accountRelations,
  session,
  sessionRelations,
  user,
  userRelations,
  verification,
} from "./schema/auth.ts";
import {
  conversation,
  conversationMessage,
  conversationMessageRelations,
  conversationRelations,
  videoShare,
} from "./schema/conversations.ts";
import { usageEvent, userCredits } from "./schema/credits.ts";
import { providerKey, userSettings } from "./schema/settings.ts";

/** Every table + relation, in one object — passed to Drizzle (for `db.query.*`)
 * and to the Better Auth adapter (so it can map its models onto our columns). */
export const schema = {
  account,
  session,
  user,
  verification,
  userSettings,
  providerKey,
  userCredits,
  usageEvent,
  conversation,
  conversationMessage,
  videoShare,
  accountRelations,
  sessionRelations,
  userRelations,
  conversationRelations,
  conversationMessageRelations,
};

/** The underlying postgres.js connection. Exposed for graceful shutdown.
 *
 * postgres.js defaults to `max: 10`, and this single pool is shared by every DB
 * consumer in the API — Better Auth session lookups (one per request, refreshed
 * every 60s past the cookie cache), the sidebar, the credit gauge, and the
 * chat-turn transactions that hold a connection for their whole duration. Ten
 * connections starve under real concurrency, so we size the pool explicitly. In
 * prod the app connects through Neon's `-pooler` (PgBouncer) endpoint, so `max`
 * is the client-side pool against the pooler — keep `max` × container-count
 * under Neon's server-side ceiling. */
export const sql = postgres(getServerEnv().databaseUrl, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
});

export const db = drizzle(sql, { schema });

export type Database = typeof db;
