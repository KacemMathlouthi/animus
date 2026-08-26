import { describe, expect, it } from "vitest";
import { parseServerEnv } from "../env/server.ts";

const MINIMAL = {
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  BETTER_AUTH_SECRET: "a-test-secret",
  R2_ACCOUNT_ID: "acct",
  R2_ACCESS_KEY_ID: "akid",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET: "animus-videos",
  ELEVENLABS_API_KEY: "el-key",
};

describe("parseServerEnv", () => {
  it("applies defaults for optional vars", () => {
    const env = parseServerEnv(MINIMAL);
    expect(env.port).toBe(8787);
    expect(env.nodeEnv).toBe("development");
    expect(env.webOrigin).toBe("http://localhost:5173");
    expect(env.betterAuthUrl).toBe("http://localhost:8787");
    expect(env.resendFrom).toBe("animus <onboarding@resend.dev>");
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() =>
      parseServerEnv({ BETTER_AUTH_SECRET: "a-test-secret" })
    ).toThrow("DATABASE_URL");
  });

  it("throws when BETTER_AUTH_SECRET is missing", () => {
    expect(() =>
      parseServerEnv({ DATABASE_URL: "postgres://u:p@localhost:5432/db" })
    ).toThrow("BETTER_AUTH_SECRET");
  });

  it("coerces PORT to a number", () => {
    const env = parseServerEnv({ ...MINIMAL, PORT: "9000" });
    expect(env.port).toBe(9000);
  });

  it("coerces CREDITS_GLOBAL_CAP_USD to a number", () => {
    const env = parseServerEnv({ ...MINIMAL, CREDITS_GLOBAL_CAP_USD: "500" });
    expect(env.creditsGlobalCapUsd).toBe(500);
  });

  it("defaults CREDITS_GLOBAL_CAP_USD to 0 (no cap), including when empty", () => {
    expect(parseServerEnv(MINIMAL).creditsGlobalCapUsd).toBe(0);
    expect(
      parseServerEnv({ ...MINIMAL, CREDITS_GLOBAL_CAP_USD: "" })
        .creditsGlobalCapUsd
    ).toBe(0);
  });

  it("rejects a negative CREDITS_GLOBAL_CAP_USD", () => {
    expect(() =>
      parseServerEnv({ ...MINIMAL, CREDITS_GLOBAL_CAP_USD: "-5" })
    ).toThrow();
  });

  it("passes optional secrets through", () => {
    const env = parseServerEnv({
      ...MINIMAL,
      ENCRYPTION_KEY: "some-key",
      EXA_API_KEY: "exa-key",
      GITHUB_CLIENT_ID: "gh-id",
    });
    expect(env.encryptionKey).toBe("some-key");
    expect(env.exaApiKey).toBe("exa-key");
    expect(env.githubClientId).toBe("gh-id");
  });

  it("defaults the Braintrust project and leaves the key optional", () => {
    const env = parseServerEnv(MINIMAL);
    expect(env.braintrustProject).toBe("animus");
    expect(env.braintrustApiKey).toBeUndefined();
  });

  it("passes the Braintrust key and project through", () => {
    const env = parseServerEnv({
      ...MINIMAL,
      BRAINTRUST_API_KEY: "bt-key",
      BRAINTRUST_PROJECT: "animus-prod",
    });
    expect(env.braintrustApiKey).toBe("bt-key");
    expect(env.braintrustProject).toBe("animus-prod");
  });

  it("prefers BEDROCK_* credentials over the AWS_* fallbacks", () => {
    const env = parseServerEnv({
      ...MINIMAL,
      BEDROCK_ACCESS_KEY_ID: "bedrock-akid",
      BEDROCK_SECRET_ACCESS_KEY: "bedrock-secret",
      BEDROCK_REGION: "eu-west-1",
      AWS_ACCESS_KEY_ID: "aws-akid",
      AWS_SECRET_ACCESS_KEY: "aws-secret",
      AWS_REGION: "us-east-1",
    });
    expect(env.bedrockAccessKeyId).toBe("bedrock-akid");
    expect(env.bedrockSecretAccessKey).toBe("bedrock-secret");
    expect(env.bedrockRegion).toBe("eu-west-1");
  });

  it("falls back to AWS_* credentials when BEDROCK_* are unset (local dev)", () => {
    const env = parseServerEnv({
      ...MINIMAL,
      AWS_ACCESS_KEY_ID: "aws-akid",
      AWS_SECRET_ACCESS_KEY: "aws-secret",
      AWS_REGION: "us-east-1",
    });
    expect(env.bedrockAccessKeyId).toBe("aws-akid");
    expect(env.bedrockSecretAccessKey).toBe("aws-secret");
    expect(env.bedrockRegion).toBe("us-east-1");
  });

  it("leaves Bedrock credentials undefined when neither is set", () => {
    const env = parseServerEnv(MINIMAL);
    expect(env.bedrockAccessKeyId).toBeUndefined();
    expect(env.bedrockRegion).toBeUndefined();
  });

  it("rejects an invalid NODE_ENV", () => {
    expect(() => parseServerEnv({ ...MINIMAL, NODE_ENV: "staging" })).toThrow();
  });

  it("maps the R2 storage credentials", () => {
    const env = parseServerEnv(MINIMAL);
    expect(env.r2AccountId).toBe("acct");
    expect(env.r2AccessKeyId).toBe("akid");
    expect(env.r2SecretAccessKey).toBe("secret");
    expect(env.r2Bucket).toBe("animus-videos");
  });

  it("throws when an R2 variable is missing", () => {
    const { R2_BUCKET, ...withoutBucket } = MINIMAL;
    expect(() => parseServerEnv(withoutBucket)).toThrow("R2_BUCKET");
  });

  it("maps and requires the ElevenLabs key", () => {
    expect(parseServerEnv(MINIMAL).elevenLabsApiKey).toBe("el-key");
    const { ELEVENLABS_API_KEY, ...withoutKey } = MINIMAL;
    expect(() => parseServerEnv(withoutKey)).toThrow("ELEVENLABS_API_KEY");
  });
});

/** Everything the production gate demands, on top of MINIMAL. */
const PROD = {
  ...MINIMAL,
  NODE_ENV: "production",
  WEB_ORIGIN: "https://tryanimus.app",
  BETTER_AUTH_URL: "https://tryanimus.app",
  BEDROCK_ACCESS_KEY_ID: "bedrock-akid",
  BEDROCK_SECRET_ACCESS_KEY: "bedrock-secret",
  BEDROCK_REGION: "us-east-1",
  ENCRYPTION_KEY: "base64-key",
  DAYTONA_API_KEY: "dt-key",
  EXA_API_KEY: "exa-key",
  RESEND_API_KEY: "re-key",
  RESEND_FROM: "animus <login@mail.tryanimus.app>",
};

describe("parseServerEnv in production", () => {
  it("accepts a fully configured production environment", () => {
    const env = parseServerEnv(PROD);
    expect(env.nodeEnv).toBe("production");
    expect(env.bedrockAccessKeyId).toBe("bedrock-akid");
  });

  it("leaves development untouched by the production gate", () => {
    // The same sparse env that production rejects must still boot in dev.
    expect(() => parseServerEnv(MINIMAL)).not.toThrow();
  });

  it.each([
    ["BEDROCK_ACCESS_KEY_ID"],
    ["BEDROCK_SECRET_ACCESS_KEY"],
    ["BEDROCK_REGION"],
    ["ENCRYPTION_KEY"],
    ["DAYTONA_API_KEY"],
    ["EXA_API_KEY"],
    ["RESEND_API_KEY"],
  ])("rejects production without %s", (key) => {
    const { [key]: _dropped, ...rest } = PROD;
    expect(() => parseServerEnv(rest)).toThrow(key);
  });

  it("accepts AWS_* as the fallback for the Bedrock credentials", () => {
    const {
      BEDROCK_ACCESS_KEY_ID: _id,
      BEDROCK_SECRET_ACCESS_KEY: _secret,
      BEDROCK_REGION: _region,
      ...rest
    } = PROD;
    const env = parseServerEnv({
      ...rest,
      AWS_ACCESS_KEY_ID: "aws-akid",
      AWS_SECRET_ACCESS_KEY: "aws-secret",
      AWS_REGION: "eu-west-1",
    });
    expect(env.bedrockAccessKeyId).toBe("aws-akid");
    expect(env.bedrockRegion).toBe("eu-west-1");
  });

  it("rejects the resend.dev sandbox sender in production", () => {
    const { RESEND_FROM: _from, ...rest } = PROD;
    // Omitted, so the schema default applies — which is the sandbox sender.
    expect(() => parseServerEnv(rest)).toThrow("RESEND_FROM");
  });

  it.each([
    ["WEB_ORIGIN"],
    ["BETTER_AUTH_URL"],
  ])("rejects a localhost %s in production", (key) => {
    expect(() =>
      parseServerEnv({ ...PROD, [key]: "http://localhost:5173" })
    ).toThrow(key);
  });

  it("reports every missing variable at once, not just the first", () => {
    const {
      DAYTONA_API_KEY: _daytona,
      EXA_API_KEY: _exa,
      ENCRYPTION_KEY: _enc,
      ...rest
    } = PROD;
    try {
      parseServerEnv(rest);
      expect.unreachable("should have thrown");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("DAYTONA_API_KEY");
      expect(message).toContain("EXA_API_KEY");
      expect(message).toContain("ENCRYPTION_KEY");
    }
  });
});
