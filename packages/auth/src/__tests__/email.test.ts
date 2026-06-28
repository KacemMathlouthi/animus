import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mutable env state so individual tests can toggle the Resend API key, which is
// read once at module load to decide whether to construct the Resend client.
const state = vi.hoisted(() => ({
  resendApiKey: "re_test_key" as string | undefined,
  resendFrom: "animus <no-reply@animus.dev>",
}));

const { send, readFile } = vi.hoisted(() => ({
  send: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("@animus/core/env", () => ({
  getServerEnv: () => ({
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

async function importModule(): Promise<typeof import("../email.ts")> {
  return await import("../email.ts");
}

beforeEach(() => {
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
