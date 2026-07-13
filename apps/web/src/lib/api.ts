/** Thin wrapper around fetch for our own API. Sends credentials so the session
 * cookie rides along, defaults to JSON, and throws a typed ApiError on non-2xx
 * (carrying the HTTP status and any `code` the server returned) so callers can
 * react to specific failures. Base URL comes from VITE_API_URL. */

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

/** A non-2xx response from our API. `code` is the machine-readable error code
 * the server sent in the JSON body (e.g. "OUT_OF_CREDITS"), when present. */
export class ApiError extends Error {
	readonly status: number;
	readonly code?: string;

	constructor(status: number, message: string, code?: string) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.code = code;
	}
}

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
		const body = (await response.json().catch(() => null)) as {
			code?: string;
			message?: string;
		} | null;
		throw new ApiError(
			response.status,
			body?.message ?? `Request to ${path} failed (${response.status})`,
			body?.code,
		);
	}
	return (await response.json()) as T;
}
