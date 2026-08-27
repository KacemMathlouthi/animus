/** The Drizzle client, bound to the full schema so queries are typed. Its URL
 * comes from `@animus/core/env`, never `process.env` directly. */

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

/** Passed to Drizzle for `db.query.*` and to the Better Auth adapter. */
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

/** Exposed for graceful shutdown. The default `max: 10` starves under real
 * concurrency, since one pool serves every session lookup alongside chat turns
 * that hold a connection for minutes. In prod this sits in front of Neon's
 * pooler, so keep `max` × container count under Neon's own ceiling. */
export const sql = postgres(getServerEnv().databaseUrl, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
});

export const db = drizzle(sql, { schema });

export type Database = typeof db;
