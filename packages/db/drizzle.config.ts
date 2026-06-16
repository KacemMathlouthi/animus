/** Config for drizzle-kit (the migration/introspection CLI). DATABASE_URL is
 * injected by the `--env-file=../../.env` flag in this package's scripts. */

import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not set (expected from .env at repo root).");
}

export default defineConfig({
  schema: "./src/schema/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
