import { useEffect } from "react";

const APP_NAME = "animus";

/** Fallback for the landing page and any route without a page-specific title. */
const DEFAULT_DOCUMENT_TITLE = "animus";

/** Sets `document.title` for the current route: a page-specific title renders
 * `"<title> · animus"`; empty/whitespace falls back to the marketing default. */
export function useDocumentTitle(title?: string | null): void {
  useEffect(() => {
    const trimmed = title?.trim();
    document.title = trimmed
      ? `${trimmed} · ${APP_NAME}`
      : DEFAULT_DOCUMENT_TITLE;
  }, [title]);
}
