/** Server-only environment: the single validated source of truth for every
 * secret and runtime setting the backend reads. Consumed by `apps/api`,
 * `packages/auth`, and (later) the agent.
 *
 * NEVER import this from the web — it reads `process.env` and carries secrets.
 * The boundary is enforced by the package's `exports` map (this is the `/env`
 * subpath, unreachable from the pure root) and a lint rule in the web app. */

import { z } from "zod";

const ServerEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  /** Port the API listens on. */
  PORT: z.coerce.number().int().positive().default(8787),
  /** Web app origin allowed to call the API with credentials (CORS + cookies). */
  WEB_ORIGIN: z.url().default("http://localhost:5173"),
  /** Postgres connection string. */
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  /** Base64 32-byte key for encrypting BYO provider keys (AES-256-GCM).
   * Optional at boot; required only when a provider key is actually stored. */
  ENCRYPTION_KEY: z.string().optional(),
  /** Optional override for the log verbosity. */
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .optional(),
  /** Secret that signs Better Auth session cookies/tokens. */
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  /** Public URL where Better Auth lives (used to build OAuth callbacks). */
  BETTER_AUTH_URL: z.url().default("http://localhost:8787"),
  /** Optional — enables the Better Auth Infrastructure dashboard when set. */
  BETTER_AUTH_API_KEY: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  /** Optional — magic links log to the console when unset. */
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().default("animus <onboarding@resend.dev>"),
  /** Amazon Bedrock inference-profile id for the agent's Claude model. AWS
   * credentials/region resolve from AWS_* env vars or the AWS credential chain. */
  BEDROCK_MODEL: z.string().default("us.anthropic.claude-opus-4-6-v1"),
  /** Exa API key used by the agent's web search and fetch tools. */
  EXA_API_KEY: z.string().optional(),
  /** Daytona API key for the sandbox the agent renders Manim in. Optional at
   * boot; required only when a turn actually needs the sandbox. */
  DAYTONA_API_KEY: z.string().optional(),
  /** Optional Daytona region/target (e.g. "us", "eu"). */
  DAYTONA_TARGET: z.string().optional(),
  /** Public base URL of this API, used to build absolute URLs for served media. (TEMP)
   * TODO: TO BE REPLACED WITH PROPER STORAGE SOLUTION LATER ON ...
   */
  API_PUBLIC_URL: z.url().default("http://localhost:8787"),
});

export interface ServerEnv {
  apiPublicUrl: string;
  bedrockModel: string;
  betterAuthApiKey?: string;
  betterAuthSecret: string;
  betterAuthUrl: string;
  databaseUrl: string;
  daytonaApiKey?: string;
  daytonaTarget?: string;
  encryptionKey?: string;
  exaApiKey?: string;
  githubClientId?: string;
  githubClientSecret?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  logLevel?: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  nodeEnv: "development" | "test" | "production";
  port: number;
  resendApiKey?: string;
  resendFrom: string;
  webOrigin: string;
}

/** Pure validation + mapping of a raw environment. Throws a readable error
 * listing every invalid/missing variable. Separated from the memoized singleton
 * below so it is testable without touching the real process.env. */
export function parseServerEnv(
  source: Record<string, string | undefined>
): ServerEnv {
  const parsed = ServerEnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(
        (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`
      )
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const e = parsed.data;
  return {
    nodeEnv: e.NODE_ENV,
    port: e.PORT,
    webOrigin: e.WEB_ORIGIN,
    databaseUrl: e.DATABASE_URL,
    encryptionKey: e.ENCRYPTION_KEY,
    exaApiKey: e.EXA_API_KEY,
    daytonaApiKey: e.DAYTONA_API_KEY,
    daytonaTarget: e.DAYTONA_TARGET,
    apiPublicUrl: e.API_PUBLIC_URL,
    logLevel: e.LOG_LEVEL,
    betterAuthSecret: e.BETTER_AUTH_SECRET,
    betterAuthUrl: e.BETTER_AUTH_URL,
    betterAuthApiKey: e.BETTER_AUTH_API_KEY,
    githubClientId: e.GITHUB_CLIENT_ID,
    githubClientSecret: e.GITHUB_CLIENT_SECRET,
    googleClientId: e.GOOGLE_CLIENT_ID,
    googleClientSecret: e.GOOGLE_CLIENT_SECRET,
    resendApiKey: e.RESEND_API_KEY,
    resendFrom: e.RESEND_FROM,
    bedrockModel: e.BEDROCK_MODEL,
  };
}

let cached: ServerEnv | null = null;

/** Parse and validate the real process environment once, then memoize. */
export function getServerEnv(): ServerEnv {
  if (!cached) {
    cached = parseServerEnv(process.env);
  }
  return cached;
}
