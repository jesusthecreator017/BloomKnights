import type { ApiErrorBody } from "#/lib/api-types";

export class ApiClientError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "ApiClientError";
		this.status = status;
	}
}

/** Same-origin fetch wrapper — cookies (auth session) ride along automatically. */
export async function fetchJson<T>(
	url: string,
	init?: RequestInit,
): Promise<T> {
	const res = await fetch(url, init);
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
		throw new ApiClientError(
			body?.error ?? `Request to ${url} failed`,
			res.status,
		);
	}
	return res.json() as Promise<T>;
}

/** Round so panning/searching within the same neighborhood doesn't refetch. */
export function roundCoord(value: number): number {
	return Math.round(value * 10) / 10;
}
