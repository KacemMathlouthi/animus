/** Thin wrapper around fetch for our own API. Sends credentials so the session
 * cookie rides along, defaults to JSON, and throws on non-2xx so callers can
 * try/catch. Base URL comes from VITE_API_URL (same default as the auth client). */

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export async function apiFetch<T>(
	path: string,
	init?: RequestInit,
): Promise<T> {
	const response = await fetch(`${API_URL}${path}`, {
		credentials: "include",
		...init,
		headers: {
			"Content-Type": "application/json",
			...init?.headers,
		},
	});
	if (!response.ok) {
		throw new Error(`Request to ${path} failed (${response.status})`);
	}
	return (await response.json()) as T;
}
