import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

const { useSession, useStartConversation } = vi.hoisted(() => ({
  useSession: vi.fn(() => ({ data: null })),
  useStartConversation: vi.fn(() => ({
    creating: false,
    error: null,
    start: vi.fn(),
  })),
}));
vi.mock("@/lib/auth-client", () => ({ useSession }));
vi.mock("@/features/studio/hooks/use-start-conversation", () => ({
  useStartConversation,
}));

const { HeroPrompt } = await import("../hero-prompt.tsx");

function renderPrompt() {
  const { container } = render(
    <MemoryRouter>
      <HeroPrompt />
    </MemoryRouter>
  );
  const shell = container.querySelector(".cta-surface");
  if (!shell) {
    throw new Error("expected the prompt shell");
  }
  return { container, shell };
}

describe("HeroPrompt", () => {
  it("raises its shell off the hero painting without losing the CTA surface", () => {
    const { shell } = renderPrompt();

    // Both classes have to be present together: box-shadow does not accumulate
    // across rules, so .cta-surface.hero-raised is what restates the surface's
    // inset highlight alongside the deeper drop. Dropping either one silently
    // loses the highlight or the lift.
    expect(shell.className).toContain("cta-surface");
    expect(shell.className).toContain("hero-raised");
  });

  it("keeps the shape the shadow is cast around", () => {
    const { shell } = renderPrompt();

    // A box-shadow follows the border radius; if the rounding moved to a wrapper
    // the lift would render as a rectangle behind a rounded card.
    expect(shell.className).toContain("rounded-xl");
  });
});
