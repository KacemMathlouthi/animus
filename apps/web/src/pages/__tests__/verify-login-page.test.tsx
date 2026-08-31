import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VerifyLoginPage } from "@/pages/verify-login-page";

const SIGN_IN = /sign in|continue|verify/i;

function renderAt(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/auth/verify${search}`]}>
      <VerifyLoginPage />
    </MemoryRouter>
  );
}

/** The button navigates the whole page, which jsdom cannot do. */
let assign: ReturnType<typeof vi.fn>;

beforeEach(() => {
  assign = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, assign, origin: "https://tryanimus.app" },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function callbackSentToApi(search: string): Promise<string | null> {
  renderAt(search);
  await userEvent.click(screen.getByRole("button", { name: SIGN_IN }));
  const target = assign.mock.calls.at(-1)?.[0] as string;
  return new URL(target).searchParams.get("callbackURL");
}

describe("VerifyLoginPage callback handling", () => {
  it("sends an absolute callback so the API does not resolve it against its own host", async () => {
    // The API builds `new URL(callbackURL, baseURL)`. In prod baseURL is
    // api.tryanimus.app, so a relative path lands the user on the API's 404
    // instead of the studio.
    expect(await callbackSentToApi("?token=t1&callbackURL=%2Fstudio")).toBe(
      "https://tryanimus.app/studio"
    );
  });

  it("keeps an absolute callback that is already on our own origin", async () => {
    expect(
      await callbackSentToApi(
        "?token=t1&callbackURL=https%3A%2F%2Ftryanimus.app%2Fstudio%2Fabc"
      )
    ).toBe("https://tryanimus.app/studio/abc");
  });

  it("refuses a callback pointing at another origin", async () => {
    expect(
      await callbackSentToApi(
        "?token=t1&callbackURL=https%3A%2F%2Fevil.test%2Fx"
      )
    ).toBe("https://tryanimus.app/studio");
  });

  it("refuses a protocol-relative callback", async () => {
    // "//evil.test" is a valid URL to the browser and would leave the app.
    expect(
      await callbackSentToApi("?token=t1&callbackURL=%2F%2Fevil.test")
    ).toBe("https://tryanimus.app/studio");
  });

  it("falls back to the studio when no callback is given", async () => {
    expect(await callbackSentToApi("?token=t1")).toBe(
      "https://tryanimus.app/studio"
    );
  });
});
