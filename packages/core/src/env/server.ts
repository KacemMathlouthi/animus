/** Server-only environment: the single validated source of truth for every
 * secret and runtime setting the backend reads. Consumed by `apps/api`,
 * `packages/auth`, and the agent.
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
  /** Braintrust API key for LLM observability. When set, the agent's AI SDK
   * calls emit OpenTelemetry traces exported to Braintrust. */
  BRAINTRUST_API_KEY: z.string().optional(),
  /** Braintrust project the LLM traces land in (the `x-bt-parent`). */
  BRAINTRUST_PROJECT: z.string().default("animus"),
  /** ElevenLabs API key for narration. Injected into the render sandbox so
   * manim-voiceover can synthesize speech during render. */
  ELEVENLABS_API_KEY: z.string().min(1, "ELEVENLABS_API_KEY is required"),
  /** Optional safety cap (whole USD) on total free-credit spend across all
   * users. When set and exceeded, brand-new accounts are seeded with a $0
   * balance instead of the free grant (existing balances are untouched). Zero
   * (the default, also what unset or empty coerces to) means unlimited free
   * grants. */
  CREDITS_GLOBAL_CAP_USD: z.coerce.number().nonnegative().default(0),
  /** Daytona API key for the sandbox the agent renders Manim in. Optional at
   * boot; required only when a turn actually needs the sandbox. */
  DAYTONA_API_KEY: z.string().optional(),
  /** Optional Daytona region/target (e.g. "us", "eu"). */
  DAYTONA_TARGET: z.string().optional(),
  /** Cloudflare R2 (S3-compatible) storage for rendered videos. The endpoint is
   * derived from the account id; the browser streams videos from R2 via
   * short-lived presigned URLs minted by the media route. */
  R2_ACCOUNT_ID: z.string().min(1, "R2_ACCOUNT_ID is required"),
  R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required"),
  R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required"),
  R2_BUCKET: z.string().min(1, "R2_BUCKET is required"),
});

export interface ServerEnv {
  bedrockModel: string;
  betterAuthApiKey?: string;
  betterAuthSecret: string;
  betterAuthUrl: string;
  braintrustApiKey?: string;
  braintrustProject: string;
  /** Whole-USD global free-spend cap; 0 means no cap. */
  creditsGlobalCapUsd: number;
  databaseUrl: string;
  daytonaApiKey?: string;
  daytonaTarget?: string;
  elevenLabsApiKey: string;
  encryptionKey?: string;
  exaApiKey?: string;
  githubClientId?: string;
  githubClientSecret?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  logLevel?: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  nodeEnv: "development" | "test" | "production";
  port: number;
  r2AccessKeyId: string;
  r2AccountId: string;
  r2Bucket: string;
  r2SecretAccessKey: string;
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
    elevenLabsApiKey: e.ELEVENLABS_API_KEY,
    daytonaApiKey: e.DAYTONA_API_KEY,
    daytonaTarget: e.DAYTONA_TARGET,
    r2AccountId: e.R2_ACCOUNT_ID,
    r2AccessKeyId: e.R2_ACCESS_KEY_ID,
    r2SecretAccessKey: e.R2_SECRET_ACCESS_KEY,
    r2Bucket: e.R2_BUCKET,
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
    braintrustApiKey: e.BRAINTRUST_API_KEY,
    braintrustProject: e.BRAINTRUST_PROJECT,
    creditsGlobalCapUsd: e.CREDITS_GLOBAL_CAP_USD,
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
