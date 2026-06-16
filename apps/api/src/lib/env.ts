/** Validated, typed access to the process environment. This is the only place
 * that reads `process.env`; everything else imports `env`. */

import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  /** Port the API listens on. */
  PORT: z.coerce.number().int().positive().default(8787),
  /** Web app origin allowed to call the API with credentials (CORS). */
  WEB_ORIGIN: z.url().default("http://localhost:5173"),
  /** Postgres connection string (consumed by @animus/db). */
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  /** Optional override for the log verbosity. */
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  webOrigin: parsed.data.WEB_ORIGIN,
  databaseUrl: parsed.data.DATABASE_URL,
  logLevel: parsed.data.LOG_LEVEL,
};

export const isProduction = env.nodeEnv === "production";
