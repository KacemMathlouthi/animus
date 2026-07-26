import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ useSession, signOut: vi.fn() }));
// The avatar pulls the credit gauge, which fetches on mount.
vi.mock("@/components/layout/nav-user", () => ({
  NavUser: () => <div data-testid="nav-user" />,
}));

const { AuthActions } = await import("../auth-actions.tsx");

const SIGN_IN = /^sign in$/i;
const GET_STARTED = /get started/i;
const OPEN_STUDIO = /open studio/i;

function renderActions(props: { stacked?: boolean } = {}) {
  return render(
    <MemoryRouter>
      <AuthActions {...props} />
    </MemoryRouter>
  );
}

describe("AuthActions", () => {
  beforeEach(() => {
    useSession.mockReset();
  });

  it("shows the signed-out buttons while the session is still pending", () => {
    // The API scales to zero, so this state can last seconds in prod. Rendering
    // nothing here is what made the header look broken on a cold start.
    useSession.mockReturnValue({ data: null, isPending: true });

    renderActions();

    expect(screen.getByRole("link", { name: SIGN_IN })).toHaveAttribute(
      "href",
      "/auth"
    );
    expect(screen.getByRole("link", { name: GET_STARTED })).toHaveAttribute(
      "href",
      "/auth"
    );
  });

  it("keeps the signed-out buttons once the session resolves to nobody", () => {
    useSession.mockReturnValue({ data: null, isPending: false });

    renderActions();

    expect(screen.getByRole("link", { name: SIGN_IN })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: OPEN_STUDIO })
    ).not.toBeInTheDocument();
  });

  it("swaps to the studio link and avatar when a session resolves", () => {
    useSession.mockReturnValue({ data: null, isPending: true });
    const { rerender } = renderActions();
    expect(screen.getByRole("link", { name: SIGN_IN })).toBeInTheDocument();

    useSession.mockReturnValue({
      data: { user: { id: "u1" } },
      isPending: false,
    });
    rerender(
      <MemoryRouter>
        <AuthActions />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: OPEN_STUDIO })).toHaveAttribute(
      "href",
      "/studio"
    );
    expect(screen.getByTestId("nav-user")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: SIGN_IN })
    ).not.toBeInTheDocument();
  });

  it("renders the last-known session through a background refetch", () => {
    // useSession flips back to pending on focus/remount; the header must not
    // fall back to the signed-out buttons each time.
    useSession.mockReturnValue({
      data: { user: { id: "u1" } },
      isPending: true,
    });

    renderActions();

    expect(screen.getByRole("link", { name: OPEN_STUDIO })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: SIGN_IN })
    ).not.toBeInTheDocument();
  });

  it("omits the avatar in the stacked mobile layout", () => {
    useSession.mockReturnValue({
      data: { user: { id: "u1" } },
      isPending: false,
    });

    renderActions({ stacked: true });

    expect(screen.getByRole("link", { name: OPEN_STUDIO })).toBeInTheDocument();
    expect(screen.queryByTestId("nav-user")).not.toBeInTheDocument();
  });
});
