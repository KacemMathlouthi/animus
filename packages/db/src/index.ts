/** Public entry for @animus/db — the package's intentional API surface. */

// biome-ignore lint/performance/noBarrelFile: this is the package's public entry, not an internal re-export
export { type Database, db, schema, sql } from "./client.ts";
