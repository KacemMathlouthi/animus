import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "@/components/error-boundary";

const RELOAD = /reload/i;
const GO_HOME = /go home/i;

function Boom(): never {
  throw new Error("render exploded");
}

describe("ErrorBoundary", () => {
  // React logs every caught error to the console; silencing it keeps the run
  // readable, and the spy doubles as the assertion that we report at all.
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {
      // swallowed
    });
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("renders its children while nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>studio content</p>
      </ErrorBoundary>
    );

    expect(screen.getByText("studio content")).toBeInTheDocument();
  });

  it("shows the recovery panel instead of a blank screen when a child throws", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something broke")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: RELOAD })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: GO_HOME })).toBeInTheDocument();
  });

  it("reports the error to the console sink", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(consoleError).toHaveBeenCalledWith(
      "[animus] uncaught render error",
      expect.objectContaining({ message: "render exploded" }),
      expect.anything()
    );
  });

  it("recovers by reloading, not by resetting the crashed tree in place", async () => {
    const reload = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      reload,
    } as unknown as Location);

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    await userEvent.click(screen.getByRole("button", { name: RELOAD }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("navigates home with a hard assignment", async () => {
    const assign = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      assign,
    } as unknown as Location);

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    await userEvent.click(screen.getByRole("button", { name: GO_HOME }));

    expect(assign).toHaveBeenCalledWith("/");
  });
});
