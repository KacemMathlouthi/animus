import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the shared env so the crypto unit test only depends on the encryption
// key, not the whole backend environment. (`mock`-prefixed name is required for
// vitest to allow referencing it inside the hoisted factory.)
let mockEncryptionKey: string | undefined;
vi.mock("@animus/core/env", () => ({
  getServerEnv: () => ({ encryptionKey: mockEncryptionKey }),
}));

const { decryptSecret, encryptSecret } = await import("../lib/crypto.ts");

const VALID_KEY = Buffer.alloc(32).toString("base64");

beforeEach(() => {
  mockEncryptionKey = VALID_KEY;
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips plaintext", () => {
    const secret = "sk-ant-secret-value";
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  it("produces a different ciphertext each call (random IV)", () => {
    const secret = "same-input-value";
    expect(encryptSecret(secret)).not.toBe(encryptSecret(secret));
  });

  it("emits an iv.tag.ciphertext payload", () => {
    const parts = encryptSecret("a-secret").split(".");
    expect(parts).toHaveLength(3);
    for (const part of parts) {
      expect(part.length).toBeGreaterThan(0);
    }
  });

  it("fails to decrypt a tampered payload", () => {
    const payload = encryptSecret("a-secret-value");
    const flipped = payload.slice(0, -1) + (payload.at(-1) === "A" ? "B" : "A");
    expect(() => decryptSecret(flipped)).toThrow();
  });

  it("throws on a malformed payload", () => {
    expect(() => decryptSecret("not-a-valid-payload")).toThrow("Malformed");
  });

  it("throws when no encryption key is configured", () => {
    mockEncryptionKey = undefined;
    expect(() => encryptSecret("x")).toThrow("ENCRYPTION_KEY");
  });

  it("throws when the key is the wrong length", () => {
    mockEncryptionKey = Buffer.alloc(16).toString("base64");
    expect(() => encryptSecret("x")).toThrow("32 bytes");
  });
});
