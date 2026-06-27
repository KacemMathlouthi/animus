import { describe, expect, it } from "vitest";
import { commandOutput } from "../sandbox/index.ts";

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
