import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "@/hooks/use-mobile";

const BREAKPOINT = 768;

/** Drives the media-query listener the hook registers; jsdom's matchMedia stub
 * never fires on its own. */
function stubMatchMedia() {
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: (_: string, handler: () => void) => {
        listeners.add(handler);
      },
      removeEventListener: (_: string, handler: () => void) => {
        listeners.delete(handler);
      },
    }))
  );
  return {
    listeners,
    resizeTo(width: number) {
      act(() => {
        Object.defineProperty(window, "innerWidth", {
          configurable: true,
          value: width,
        });
        for (const handler of listeners) {
          handler();
        }
      });
    },
  };
}

describe("useIsMobile", () => {
  let media: ReturnType<typeof stubMatchMedia>;

  beforeEach(() => {
    media = stubMatchMedia();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports mobile below the breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: BREAKPOINT - 1,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("reports desktop at and above the breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: BREAKPOINT,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("follows a resize across the breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1280,
    });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    media.resizeTo(400);

    expect(result.current).toBe(true);
  });

  it("detaches its listener on unmount", () => {
    const { unmount } = renderHook(() => useIsMobile());
    expect(media.listeners.size).toBe(1);

    unmount();

    expect(media.listeners.size).toBe(0);
  });
});
