/** The Drizzle database client. Reads DATABASE_URL from the environment and
 * binds the full schema so queries are fully typed (db.query.user, etc.). */

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

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env (see the repo root)."
  );
}

/** The underlying postgres.js connection. Exposed for graceful shutdown. */
export const sql = postgres(connectionString);

export const db = drizzle(sql, { schema });

export type Database = typeof db;
