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
