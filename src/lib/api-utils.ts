import { cached } from "./cache";

// several public APIs (NOAA ERDDAP, OSM Overpass) reject the default fetch UA
export const USER_AGENT = "BloomKnights/1.0 (hackathon environmental map)";

export function jsonError(message: string, status: number): Response {
	return Response.json({ error: message }, { status });
}

/** Parse and validate lat/lng query params. Returns null if missing/invalid. */
export function parseLatLng(url: URL): { lat: number; lng: number } | null {
	const latParam = url.searchParams.get("lat");
	const lngParam = url.searchParams.get("lng");
	const lat = latParam === null ? NaN : Number(latParam);
	const lng = lngParam === null ? NaN : Number(lngParam);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
	if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
	return { lat, lng };
}

/** Cache key that groups nearby coordinates (2dp ≈ 1km) into one upstream call. */
export function geoCacheKey(prefix: string, lat: number, lng: number): string {
	return `${prefix}:${lat.toFixed(2)},${lng.toFixed(2)}`;
}

/** Common TTLs in ms. */
export const TTL = {
	weather: 30 * 60_000,
	daily: 6 * 60 * 60_000,
	rare: 24 * 60 * 60_000,
} as const;

/** Fetch + parse JSON, throwing on transport error or non-2xx. */
async function fetchJson(
	url: string | URL,
	timeoutMs: number,
	name: string,
): Promise<unknown> {
	const res = await fetch(url, {
		signal: AbortSignal.timeout(timeoutMs),
		headers: { "user-agent": USER_AGENT },
	});
	if (!res.ok) throw new Error(`${name} responded ${res.status}`);
	return res.json();
}

interface FetchOpts {
	timeoutMs?: number;
	name?: string;
	/** When set with ttlMs, identical calls share one cached upstream response. */
	cacheKey?: string;
	ttlMs?: number;
}

/**
 * Fetch an upstream API; returns the parsed JSON or a Response error to pass
 * through. With `cacheKey` + `ttlMs`, successful responses are cached in-process
 * so repeated (and concurrent) requests don't re-hit the third-party API.
 */
export async function fetchUpstream(
	url: string | URL,
	{ timeoutMs = 10_000, name = "upstream", cacheKey, ttlMs }: FetchOpts = {},
): Promise<{ ok: true; data: unknown } | { ok: false; response: Response }> {
	try {
		const data =
			cacheKey && ttlMs
				? await cached(cacheKey, ttlMs, () => fetchJson(url, timeoutMs, name))
				: await fetchJson(url, timeoutMs, name);
		return { ok: true, data };
	} catch (err) {
		const message =
			err instanceof Error ? err.message : `${name} request failed`;
		return { ok: false, response: jsonError(message, 502) };
	}
}
