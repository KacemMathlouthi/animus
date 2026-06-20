import { describe, expect, it } from "vitest";
import { parseServerEnv } from "../env/server.ts";

const MINIMAL = {
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  BETTER_AUTH_SECRET: "a-test-secret",
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

  it("rejects an invalid NODE_ENV", () => {
    expect(() => parseServerEnv({ ...MINIMAL, NODE_ENV: "staging" })).toThrow();
  });
});
