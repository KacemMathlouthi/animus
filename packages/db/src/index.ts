// biome-ignore lint/performance/noBarrelFile: this is the package's public entry, not an internal re-export
export {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  or,
  // drizzle's SQL-fragment builder (for aggregates / raw arithmetic). Named to
  // avoid colliding with the postgres.js client also exported as `sql`.
  sql as sqlExpr,
} from "drizzle-orm";
export { type Database, db, schema, sql } from "./client.ts";
export {
  conversation,
  conversationMessage,
  videoShare,
} from "./schema/conversations.ts";
export { usageEvent, userCredits } from "./schema/credits.ts";
export { providerKey, userSettings } from "./schema/settings.ts";
