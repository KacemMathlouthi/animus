import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UserAvatar } from "@/components/user-avatar";
import { GRID, identiconFrom } from "@/lib/identicon";

function blockCount(seed: string): number {
  return identiconFrom(seed).cells.flat().filter(Boolean).length;
}

/** A single tone drawn straight from the theme tokens. */
const TOKEN_FILL = /^oklch\(var\(--identicon-l\) var\(--identicon-c\) \d+\)$/;

/** The drawn blocks only — the <title> carries the label, not the seed. */
function markOf(): string {
  return Array.from(screen.getByTestId("identicon").querySelectorAll("rect"))
    .map(
      (rect) =>
        `${rect.getAttribute("x")},${rect.getAttribute("y")},${rect.getAttribute("fill")}`
    )
    .join("|");
}

describe("UserAvatar", () => {
  it("renders an identicon when there is no image", () => {
    render(<UserAvatar email="ada@example.com" name="Ada" />);
    const svg = screen.getByTestId("identicon");
    expect(svg).toBeInTheDocument();
    expect(svg.querySelectorAll("rect")).toHaveLength(
      blockCount("ada@example.com:Ada")
    );
  });

  it("labels the identicon with the display name", () => {
    render(<UserAvatar email="ada@example.com" name="Ada Lovelace" />);
    expect(screen.getByTitle("Ada Lovelace")).toBeInTheDocument();
  });

  it("falls back to the email, then to 'User', for the label", () => {
    const { unmount } = render(<UserAvatar email="ada@example.com" />);
    expect(screen.getByTitle("ada@example.com")).toBeInTheDocument();
    unmount();

    render(<UserAvatar />);
    expect(screen.getByTitle("User")).toBeInTheDocument();
  });

  it("seeds on email:name, so the same person keeps the same mark", () => {
    const { unmount } = render(
      <UserAvatar email="ada@example.com" name="Ada" />
    );
    const before = markOf();
    unmount();

    render(<UserAvatar email="ada@example.com" name="Ada" />);
    expect(markOf()).toBe(before);
  });

  it("changes the mark when either half of the seed changes", () => {
    const { unmount } = render(
      <UserAvatar email="ada@example.com" name="Ada" />
    );
    const base = markOf();
    unmount();

    const renamed = render(
      <UserAvatar email="ada@example.com" name="A. Lovelace" />
    );
    expect(markOf()).not.toBe(base);
    renamed.unmount();

    render(<UserAvatar email="grace@example.com" name="Ada" />);
    expect(markOf()).not.toBe(base);
  });

  it("draws blocks edge to edge across the whole grid", () => {
    render(<UserAvatar email="ada@example.com" name="Ada" />);
    const svg = screen.getByTestId("identicon");
    expect(svg).toHaveAttribute("viewBox", `0 0 ${GRID} ${GRID}`);
    for (const rect of svg.querySelectorAll("rect")) {
      expect(Number(rect.getAttribute("x"))).toBeLessThan(GRID);
      expect(Number(rect.getAttribute("y"))).toBeLessThan(GRID);
      expect(rect).toHaveAttribute("width", "1");
      expect(rect).toHaveAttribute("height", "1");
    }
  });

  it("draws one tone, taken from the theme tokens rather than a fixed hex", () => {
    render(<UserAvatar email="ada@example.com" name="Ada" />);
    const fills = new Set(
      Array.from(
        screen.getByTestId("identicon").querySelectorAll("rect"),
        (rect) => rect.getAttribute("fill")
      )
    );
    expect(fills.size).toBe(1);
    expect([...fills][0]).toMatch(TOKEN_FILL);
  });

  it("renders the identicon inside a rounded square when asked", () => {
    const { container } = render(<UserAvatar email="ada@x.com" square />);
    expect(container.querySelector('[data-slot="avatar"]')).toHaveClass(
      "rounded-md"
    );
  });

  it("still renders the identicon underneath when an image is supplied", () => {
    // Radix keeps the fallback mounted until the image actually loads, which
    // jsdom never does — so the identicon is what a test environment sees.
    render(<UserAvatar email="ada@x.com" image="https://cdn.test/a.png" />);
    expect(screen.getByTestId("identicon")).toBeInTheDocument();
  });
});
