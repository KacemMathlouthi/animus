import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDocumentTitle } from "@/hooks/use-document-title";

describe("useDocumentTitle", () => {
  it("suffixes a page title with the app name", () => {
    renderHook(() => useDocumentTitle("How Vaccines Train Immunity"));

    expect(document.title).toBe("How Vaccines Train Immunity · animus");
  });

  it("trims the title before composing it", () => {
    renderHook(() => useDocumentTitle("  Settings  "));

    expect(document.title).toBe("Settings · animus");
  });

  it("falls back to the bare app name for an absent or blank title", () => {
    for (const title of [undefined, null, "", "   "]) {
      const { unmount } = renderHook(() => useDocumentTitle(title));
      expect(document.title).toBe("animus");
      unmount();
    }
  });

  it("follows the title as it changes", () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: "Loading video" },
    });
    expect(document.title).toBe("Loading video · animus");

    rerender({ title: "Video unavailable" });

    expect(document.title).toBe("Video unavailable · animus");
  });
});
