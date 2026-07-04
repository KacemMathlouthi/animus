/** Client helpers for publishing a rendered video: minting a permanent public
 * share link and downloading the mp4. Both go through the authenticated media
 * API, which ownership-checks the underlying key. */

import type { CreateShareResponse } from "@animus/core";
import { apiFetch } from "@/lib/api";

/** Create (or re-fetch) the permanent unlisted share for a video and return the
 * public URL to post — `<origin>/v/<token>`. Served so crawlers get per-share
 * link-preview meta (the branded card + inline video) and humans get the player. */
export async function createShareLink(videoKey: string): Promise<string> {
	const { token } = await apiFetch<CreateShareResponse>("/api/media/share", {
		method: "POST",
		body: JSON.stringify({ videoKey }),
	});
	return `${window.location.origin}/v/${token}`;
}

/** Download the video as an mp4 with a friendly filename, straight from R2 via a
 * short-lived attachment-disposition presigned URL. */
export async function downloadVideo(
	videoKey: string,
	title: string,
): Promise<void> {
	const { url } = await apiFetch<{ url: string }>(
		`/api/media/download?key=${encodeURIComponent(videoKey)}&filename=${encodeURIComponent(title)}`,
	);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.rel = "noopener";
	document.body.append(anchor);
	anchor.click();
	anchor.remove();
}
