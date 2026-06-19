/** Config for drizzle-kit (the migration/introspection CLI). DATABASE_URL is
 * injected by the `--env-file=../../.env` flag in this package's scripts. */

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Supplied via --env-file in this package's scripts; drizzle-kit reports a
  // clear error if it is missing when a command actually runs.
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
