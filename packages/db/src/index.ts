/** Public entry for @animus/db — the package's intentional API surface. */

// biome-ignore lint/performance/noBarrelFile: this is the package's public entry, not an internal re-export
export {
  and,
  asc,
  desc,
  eq,
  exists,
  ilike,
  or,
  sql as querySql,
} from "drizzle-orm";
export { type Database, db, schema, sql } from "./client.ts";
export {
  conversation,
  conversationMessage,
} from "./schema/conversations.ts";
export { providerKey, userSettings } from "./schema/settings.ts";
