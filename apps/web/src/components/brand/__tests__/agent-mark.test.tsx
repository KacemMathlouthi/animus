import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AgentMark } from "@/components/brand/agent-mark";

describe("AgentMark", () => {
  it("fills its tile edge to edge, with no silhouette", () => {
    const { container } = render(<AgentMark />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg?.querySelectorAll("path")).toHaveLength(0);

    const [tile] = Array.from(svg?.querySelectorAll("rect") ?? []);
    expect(tile).toHaveAttribute("width", "24");
    expect(tile).toHaveAttribute("height", "24");
  });

  it("draws exactly two eyes, symmetric about the centre", () => {
    const { container } = render(<AgentMark />);
    const [, left, right] = Array.from(
      container.querySelectorAll("svg rect")
    ) as SVGRectElement[];

    expect(right).toBeDefined();
    expect(container.querySelectorAll("svg rect")).toHaveLength(3);

    const leftEdge = Number(left?.getAttribute("x"));
    const rightEdge =
      Number(right?.getAttribute("x")) + Number(right?.getAttribute("width"));
    expect(leftEdge).toBeCloseTo(24 - rightEdge, 5);
    expect(left?.getAttribute("y")).toBe(right?.getAttribute("y"));
  });

  it("gives each instance its own gradient ids so marks don't collide", () => {
    const { container } = render(
      <>
        <AgentMark />
        <AgentMark />
      </>
    );
    const ids = Array.from(
      container.querySelectorAll("linearGradient"),
      (node) => node.id
    );
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
  });

  it("passes className and accessible name through", () => {
    render(<AgentMark className="size-8" />);
    const svg = screen.getByRole("img", { name: "animus" });
    expect(svg).toHaveClass("size-8");
  });
});
