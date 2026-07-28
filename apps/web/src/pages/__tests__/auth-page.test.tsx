/** The sign-in page's "you last signed in with …" hint. The value comes from a
 * cookie Better Auth sets on the previous successful sign-in, so the auth
 * client is mocked here — these tests are about what the page says, not about
 * how the cookie is read. */

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthPage } from "@/pages/auth-page";

// Purely decorative, and its WebGL shader rejects under jsdom — stubbing it
// keeps the run clean and keeps these tests about the copy.
vi.mock("@/features/auth/components/auth-backdrop", () => ({
  AuthBackdrop: () => null,
}));

const getLastUsedLoginMethod = vi.fn<() => string | null>();

vi.mock("@/lib/auth-client", () => ({
  getLastUsedLoginMethod: () => getLastUsedLoginMethod(),
  signIn: { magicLink: vi.fn(), social: vi.fn() },
  useSession: () => ({ data: null, isPending: false }),
}));

const LAST_SIGNED_IN = /you last signed in with/i;
const GOOGLE = /continue with google/i;
const GITHUB = /continue with github/i;

function renderPage() {
  render(
    <MemoryRouter>
      <AuthPage />
    </MemoryRouter>
  );
}

describe("AuthPage last-used login method", () => {
  beforeEach(() => {
    getLastUsedLoginMethod.mockReset();
  });

  it("says nothing on a first visit", () => {
    getLastUsedLoginMethod.mockReturnValue(null);
    renderPage();

    expect(screen.queryByText(LAST_SIGNED_IN)).not.toBeInTheDocument();
    // The sign-in options are all still there and untouched.
    expect(screen.getByRole("button", { name: GOOGLE })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: GITHUB })).toBeInTheDocument();
  });

  it.each([
    ["google", "Google"],
    ["github", "GitHub"],
    // Better Auth labels the emailed-link flow "magic-link", not "email" —
    // keying the copy off "email" would silently never render.
    ["magic-link", "an email link"],
  ])("names %s as the method used last", (method, expected) => {
    getLastUsedLoginMethod.mockReturnValue(method);
    renderPage();

    const hint = screen.getByText(LAST_SIGNED_IN);
    expect(hint).toHaveTextContent(`You last signed in with ${expected}.`);
  });

  it("says nothing for a method the page does not offer", () => {
    getLastUsedLoginMethod.mockReturnValue("passkey");
    renderPage();

    expect(screen.queryByText(LAST_SIGNED_IN)).not.toBeInTheDocument();
  });

  it("leaves the buttons unlabelled, so none of them shifts", () => {
    getLastUsedLoginMethod.mockReturnValue("google");
    renderPage();

    // The hint lives outside the buttons on purpose: an in-button badge moved
    // the centred label and clashed with the primary button's fill.
    expect(screen.getByRole("button", { name: GOOGLE })).not.toHaveTextContent(
      LAST_SIGNED_IN
    );
  });
});
