import { useEffect } from "react";

const APP_NAME = "animus";

/** The fallback used on the landing page and whenever a route has no
 * page-specific title yet. */
const DEFAULT_DOCUMENT_TITLE = "animus";

/**
 * Sets `document.title` for the current route. Pass a page-specific title to
 * render `"<title> · animus"`; pass nothing (or an empty/whitespace string) to
 * fall back to the marketing default.
 */
export function useDocumentTitle(title?: string | null): void {
	useEffect(() => {
		const trimmed = title?.trim();
		document.title = trimmed
			? `${trimmed} · ${APP_NAME}`
			: DEFAULT_DOCUMENT_TITLE;
	}, [title]);
}
