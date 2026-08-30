/** The validated source of truth for every backend secret and runtime setting.
 * NEVER import from the web: the `exports` map keeps this off the pure root and
 * a lint rule in the web app backs that up. */

import { z } from "zod";

/** Resend's shared sender: only delivers to the account owner, so dev-only. */
const RESEND_FROM_DEFAULT = "animus <onboarding@resend.dev>";

const ServerEnvBaseSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
  /** Origin allowed to call the API with credentials (CORS + cookies). */
  WEB_ORIGIN: z.url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  /** Base64 32-byte AES-256-GCM key. Needed only once a key is stored. */
  ENCRYPTION_KEY: z.string().optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .optional(),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  /** Public Better Auth URL; OAuth callbacks are built from it. */
  BETTER_AUTH_URL: z.url().default("http://localhost:8787"),
  /** Enables the Better Auth Infrastructure dashboard when set. */
  BETTER_AUTH_API_KEY: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  /** Magic links log to the console when unset. */
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().default(RESEND_FROM_DEFAULT),
  /** Bedrock inference-profile id for the agent's Claude model. */
  BEDROCK_MODEL: z.string().default("us.anthropic.claude-opus-4-6-v1"),
  /** Passed to the provider explicitly. The BEDROCK_* names exist because
   * Vercel shadows user-supplied AWS_* values at runtime; the AWS_* fallbacks
   * are only so a local .env keeps working. */
  BEDROCK_ACCESS_KEY_ID: z.string().optional(),
  BEDROCK_SECRET_ACCESS_KEY: z.string().optional(),
  BEDROCK_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  /** Powers the agent's web search and fetch tools. */
  EXA_API_KEY: z.string().optional(),
  /** When set, the agent's AI SDK calls emit OTel traces to Braintrust. */
  BRAINTRUST_API_KEY: z.string().optional(),
  BRAINTRUST_PROJECT: z.string().default("animus"),
  /** Injected into the render sandbox for manim-voiceover. */
  ELEVENLABS_API_KEY: z.string().min(1, "ELEVENLABS_API_KEY is required"),
  /** Whole-USD cap on total free-credit spend. Past it, new accounts start at
   * $0 instead of the grant; existing balances are untouched. 0 means no cap,
   * which is also what unset or empty coerces to. */
  CREDITS_GLOBAL_CAP_USD: z.coerce.number().nonnegative().default(0),
  /** Resolved lazily: only a turn that needs the sandbox requires it. */
  DAYTONA_API_KEY: z.string().optional(),
  DAYTONA_TARGET: z.string().optional(),
  /** R2 video storage. The endpoint is derived from the account id. */
  R2_ACCOUNT_ID: z.string().min(1, "R2_ACCOUNT_ID is required"),
  R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required"),
  R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required"),
  R2_BUCKET: z.string().min(1, "R2_BUCKET is required"),
});

type RawServerEnv = z.infer<typeof ServerEnvBaseSchema>;

/** True for a URL still pointing at a developer's machine. */
function isLocalUrl(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

/** Vars kept optional in dev so a contributor can run without every account,
 * but whose absence in production fails silently rather than loudly — a missing
 * Bedrock key resolves to the host's own IAM role instead of erroring at boot.
 * OAuth ids stay optional: a self-host may run magic-link sign-in only. */
function productionIssues(
  e: RawServerEnv
): { message: string; path: string }[] {
  const issues: { message: string; path: string }[] = [];
  const required = (path: string, value: string | undefined, why: string) => {
    if (!value) {
      issues.push({ message: `required in production (${why})`, path });
    }
  };

  required(
    "BEDROCK_ACCESS_KEY_ID",
    e.BEDROCK_ACCESS_KEY_ID ?? e.AWS_ACCESS_KEY_ID,
    "unset silently falls back to the host's own IAM role"
  );
  required(
    "BEDROCK_SECRET_ACCESS_KEY",
    e.BEDROCK_SECRET_ACCESS_KEY ?? e.AWS_SECRET_ACCESS_KEY,
    "unset silently falls back to the host's own IAM role"
  );
  required(
    "BEDROCK_REGION",
    e.BEDROCK_REGION ?? e.AWS_REGION,
    "model access is granted per region"
  );
  required(
    "ENCRYPTION_KEY",
    e.ENCRYPTION_KEY,
    "storing a BYO provider key fails without it"
  );
  required(
    "DAYTONA_API_KEY",
    e.DAYTONA_API_KEY,
    "every render turn needs the sandbox"
  );
  required(
    "EXA_API_KEY",
    e.EXA_API_KEY,
    "the agent's research tools fail mid-turn without it"
  );
  required(
    "RESEND_API_KEY",
    e.RESEND_API_KEY,
    "magic links are the primary sign-in path"
  );

  if (e.RESEND_FROM === RESEND_FROM_DEFAULT) {
    issues.push({
      message:
        "the default resend.dev sender only delivers to the account owner, so every other user's sign-in email is dropped",
      path: "RESEND_FROM",
    });
  }
  for (const path of ["WEB_ORIGIN", "BETTER_AUTH_URL"] as const) {
    if (isLocalUrl(e[path])) {
      issues.push({
        message: `still points at localhost (${e[path]})`,
        path,
      });
    }
  }

  return issues;
}

const ServerEnvSchema = ServerEnvBaseSchema.superRefine((e, ctx) => {
  if (e.NODE_ENV !== "production") {
    return;
  }
  for (const { path, message } of productionIssues(e)) {
    ctx.addIssue({ code: "custom", message, path: [path] });
  }
});

export interface ServerEnv {
  /** Undefined lets the SDK's own credential chain apply. */
  bedrockAccessKeyId?: string;
  bedrockModel: string;
  bedrockRegion?: string;
  bedrockSecretAccessKey?: string;
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

/** Pure so it is testable without the real process.env. Throws listing every
 * invalid or missing variable. */
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
    bedrockAccessKeyId: e.BEDROCK_ACCESS_KEY_ID ?? e.AWS_ACCESS_KEY_ID,
    bedrockSecretAccessKey:
      e.BEDROCK_SECRET_ACCESS_KEY ?? e.AWS_SECRET_ACCESS_KEY,
    bedrockRegion: e.BEDROCK_REGION ?? e.AWS_REGION,
    braintrustApiKey: e.BRAINTRUST_API_KEY,
    braintrustProject: e.BRAINTRUST_PROJECT,
    creditsGlobalCapUsd: e.CREDITS_GLOBAL_CAP_USD,
  };
}

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (!cached) {
    cached = parseServerEnv(process.env);
  }
  return cached;
}
