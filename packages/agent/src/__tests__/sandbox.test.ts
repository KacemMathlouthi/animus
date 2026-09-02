import {
  DaytonaAuthenticationError,
  DaytonaAuthorizationError,
  DaytonaConnectionError,
  DaytonaNotFoundError,
  DaytonaValidationError,
} from "@daytonaio/sdk";
import { describe, expect, it } from "vitest";
import { commandOutput, isSandboxProvisioningError } from "../sandbox/index.ts";

describe("commandOutput", () => {
  it("returns artifacts.stdout when present", () => {
    expect(
      commandOutput({ artifacts: { stdout: "from-stdout" }, result: "ignored" })
    ).toBe("from-stdout");
  });

  it("falls back to result when there is no stdout", () => {
    expect(commandOutput({ result: "from-result" })).toBe("from-result");
    expect(commandOutput({ artifacts: {}, result: "from-result" })).toBe(
      "from-result"
    );
  });

  it("falls back to an empty string when neither is present", () => {
    expect(commandOutput({})).toBe("");
    expect(commandOutput({ artifacts: {} })).toBe("");
  });

  it("prefers stdout even when it is an empty string", () => {
    expect(commandOutput({ artifacts: { stdout: "" }, result: "result" })).toBe(
      ""
    );
  });
});

describe("isSandboxProvisioningError", () => {
  it("is true for a quota rejection from the sandbox host", () => {
    // The 30GiB storage cap surfaces as a validation error on create; it is a
    // capacity problem, not a broken turn, so the API answers 503 not 500.
    expect(
      isSandboxProvisioningError(
        new DaytonaValidationError("Total disk limit exceeded.")
      )
    ).toBe(true);
  });

  it("is true when the host is unreachable", () => {
    expect(isSandboxProvisioningError(new DaytonaConnectionError("down"))).toBe(
      true
    );
  });

  it("is true for a missing sandbox", () => {
    expect(isSandboxProvisioningError(new DaytonaNotFoundError("gone"))).toBe(
      true
    );
  });

  it("is false for rejected credentials, which never clear on their own", () => {
    // A revoked or misconfigured key takes the sandbox down for everyone
    // permanently. "Try again in a few minutes" would bury that outage.
    expect(
      isSandboxProvisioningError(new DaytonaAuthenticationError("bad key"))
    ).toBe(false);
    expect(
      isSandboxProvisioningError(new DaytonaAuthorizationError("forbidden"))
    ).toBe(false);
  });

  it("is false for our own errors, which are real bugs", () => {
    expect(
      isSandboxProvisioningError(new Error("DAYTONA_API_KEY is required"))
    ).toBe(false);
    expect(isSandboxProvisioningError("nope")).toBe(false);
    expect(isSandboxProvisioningError(undefined)).toBe(false);
  });
});
