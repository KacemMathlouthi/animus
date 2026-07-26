import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { NotFoundPage } from "@/pages/not-found-page";

const GO_HOME = /go home/i;
const OPEN_STUDIO = /open studio/i;

describe("NotFoundPage", () => {
  it("says what happened and titles the document", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(document.title).toBe("Page not found · animus");
  });

  it("offers a way out to both the landing page and the studio", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: GO_HOME })).toHaveAttribute(
      "href",
      "/"
    );
    expect(screen.getByRole("link", { name: OPEN_STUDIO })).toHaveAttribute(
      "href",
      "/studio"
    );
  });
});
