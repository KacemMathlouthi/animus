import { describe, expect, it } from "vitest";
import { displayNameFrom } from "@/lib/user";

describe("displayNameFrom", () => {
  it("prefers the real name when there is one", () => {
    expect(displayNameFrom("Kacem Mathlouthi", "cc@callab.ai")).toBe(
      "Kacem Mathlouthi"
    );
  });

  it("trims a padded name", () => {
    expect(displayNameFrom("  Kacem  ", "cc@callab.ai")).toBe("Kacem");
  });

  it("derives a name from the email when there is none", () => {
    // Magic-link sign-ups never provide a name.
    expect(displayNameFrom(null, "kacem@example.com")).toBe("Kacem");
    expect(displayNameFrom(undefined, "kacem@example.com")).toBe("Kacem");
    expect(displayNameFrom("   ", "kacem@example.com")).toBe("Kacem");
  });

  it("splits the local part on dots, underscores and dashes", () => {
    expect(displayNameFrom(null, "kacem.mathlouthi@example.com")).toBe(
      "Kacem Mathlouthi"
    );
    expect(displayNameFrom(null, "kacem_m@example.com")).toBe("Kacem M");
    expect(displayNameFrom(null, "kacem-m@example.com")).toBe("Kacem M");
    expect(displayNameFrom(null, "a.b-c_d@example.com")).toBe("A B C D");
  });

  it("collapses runs of separators instead of emitting blanks", () => {
    expect(displayNameFrom(null, "kacem..m@example.com")).toBe("Kacem M");
    expect(displayNameFrom(null, ".kacem.@example.com")).toBe("Kacem");
  });

  it("falls back to the whole string when there is no @", () => {
    expect(displayNameFrom(null, "kacem")).toBe("Kacem");
  });
});
