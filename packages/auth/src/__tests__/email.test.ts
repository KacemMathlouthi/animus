import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mutable env state so individual tests can toggle the Resend API key, which is
// read once at module load to decide whether to construct the Resend client.
const state = vi.hoisted(() => ({
  nodeEnv: "development" as "development" | "production" | "test",
  resendApiKey: "re_test_key" as string | undefined,
  resendFrom: "animus <no-reply@animus.dev>",
}));

const { send, readFile } = vi.hoisted(() => ({
  send: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("@animus/core/env", () => ({
  getServerEnv: () => ({
    nodeEnv: state.nodeEnv,
    resendApiKey: state.resendApiKey,
    resendFrom: state.resendFrom,
  }),
}));

vi.mock("node:fs/promises", () => ({
  readFile,
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

const EMAIL = "person@example.com";
const URL_TOKEN = "abc123token";
const URL = `https://animus.dev/api/auth/magic-link/verify?token=${URL_TOKEN}`;
const SEND_FAILED = /Failed to send the magic link/;
const MISSING_KEY = /RESEND_API_KEY/;

async function importModule(): Promise<typeof import("../email.ts")> {
  return await import("../email.ts");
}

beforeEach(() => {
  state.nodeEnv = "development";
  state.resendApiKey = "re_test_key";
  state.resendFrom = "animus <no-reply@animus.dev>";
  send.mockReset();
  readFile.mockReset();
  readFile.mockResolvedValue(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  vi.resetModules();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("deliverMagicLink (success path)", () => {
  it("sends via Resend with the correct from/to/subject", async () => {
    send.mockResolvedValue({ error: null });
    const { deliverMagicLink } = await importModule();

    await deliverMagicLink({ email: EMAIL, url: URL });

    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      from: "animus <no-reply@animus.dev>",
      to: EMAIL,
      subject: "Your animus sign-in link",
    });
  });

  it("includes the magic-link URL/token in both the html and text bodies", async () => {
    send.mockResolvedValue({ error: null });
    const { deliverMagicLink } = await importModule();

    await deliverMagicLink({ email: EMAIL, url: URL });

    const payload = send.mock.calls[0]?.[0];
    expect(payload.html).toContain(URL);
    expect(payload.html).toContain(URL_TOKEN);
    expect(payload.text).toContain(URL);
  });

  it("attaches the inline logo referenced by the html via its content id", async () => {
    send.mockResolvedValue({ error: null });
    const { deliverMagicLink } = await importModule();

    await deliverMagicLink({ email: EMAIL, url: URL });

    const payload = send.mock.calls[0]?.[0];
    expect(payload.attachments).toEqual([
      {
        filename: "logo.png",
        content: expect.any(Buffer),
        contentType: "image/png",
        contentId: "logo",
      },
    ]);
    // The html references the attachment via cid:logo.
    expect(payload.html).toContain("cid:logo");
  });
});

describe("deliverMagicLink (error path)", () => {
  it("does not throw and logs the link when Resend returns an error", async () => {
    const sendError = { name: "send_error", message: "boom" };
    send.mockResolvedValue({ error: sendError });
    const { deliverMagicLink } = await importModule();

    await expect(
      deliverMagicLink({ email: EMAIL, url: URL })
    ).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledWith(
      "Failed to send magic link via Resend:",
      sendError
    );
    expect(console.log).toHaveBeenCalledWith(`Magic link for ${EMAIL}: ${URL}`);
  });
});

describe("deliverMagicLink (no API key fallback)", () => {
  it("logs the link to the console and never calls Resend", async () => {
    state.resendApiKey = undefined;
    vi.resetModules();
    const { deliverMagicLink } = await importModule();

    await deliverMagicLink({ email: EMAIL, url: URL });

    expect(send).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(`Magic link for ${EMAIL}: ${URL}`);
  });
});

describe("magicLinkPageUrl", () => {
  it("builds the web interstitial URL, not the API verify endpoint", async () => {
    const { magicLinkPageUrl } = await importModule();

    const url = new globalThis.URL(
      magicLinkPageUrl({
        webOrigin: "https://tryanimus.app",
        token: "tok_123",
        callbackURL: "/studio",
      })
    );

    expect(url.origin).toBe("https://tryanimus.app");
    expect(url.pathname).toBe("/auth/verify");
    expect(url.searchParams.get("token")).toBe("tok_123");
    expect(url.searchParams.get("callbackURL")).toBe("/studio");
    // The one property the scanner bug hinges on: the emailed link must never
    // target the token-consuming endpoint directly.
    expect(url.pathname).not.toContain("magic-link/verify");
  });

  it("percent-encodes token and callback safely", async () => {
    const { magicLinkPageUrl } = await importModule();

    const raw = magicLinkPageUrl({
      webOrigin: "https://tryanimus.app",
      token: "t/+=&?",
      callbackURL: "/studio/c/abc?x=1",
    });
    const url = new globalThis.URL(raw);

    expect(url.searchParams.get("token")).toBe("t/+=&?");
    expect(url.searchParams.get("callbackURL")).toBe("/studio/c/abc?x=1");
  });
});

describe("deliverMagicLink in production", () => {
  it("never prints the link when a send fails", async () => {
    // The link is a working single-use credential. Echoing it into a log drain
    // hands sign-in to anyone who can read logs.
    state.nodeEnv = "production";
    send.mockResolvedValue({ error: { message: "domain not verified" } });
    const { deliverMagicLink } = await importModule();

    await expect(deliverMagicLink({ email: EMAIL, url: URL })).rejects.toThrow(
      "domain not verified"
    );

    expect(console.log).not.toHaveBeenCalled();
    for (const call of vi.mocked(console.error).mock.calls) {
      expect(JSON.stringify(call)).not.toContain(URL_TOKEN);
    }
  });

  it("throws instead of swallowing the failure", async () => {
    // Swallowing left the UI saying "check your email" when nothing was sent.
    state.nodeEnv = "production";
    send.mockResolvedValue({ error: { message: "rate limited" } });
    const { deliverMagicLink } = await importModule();

    await expect(deliverMagicLink({ email: EMAIL, url: URL })).rejects.toThrow(
      SEND_FAILED
    );
  });

  it("throws rather than printing the link when the key is missing", async () => {
    state.nodeEnv = "production";
    state.resendApiKey = undefined;
    const { deliverMagicLink } = await importModule();

    await expect(deliverMagicLink({ email: EMAIL, url: URL })).rejects.toThrow(
      MISSING_KEY
    );
    expect(console.log).not.toHaveBeenCalled();
  });

  it("still resolves quietly when the send succeeds", async () => {
    state.nodeEnv = "production";
    send.mockResolvedValue({ error: null });
    const { deliverMagicLink } = await importModule();

    await expect(
      deliverMagicLink({ email: EMAIL, url: URL })
    ).resolves.toBeUndefined();
    expect(console.log).not.toHaveBeenCalled();
  });
});
