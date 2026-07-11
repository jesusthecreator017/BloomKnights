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

/** Fetch an upstream API with a timeout; returns the parsed JSON or a Response error to pass through. */
export async function fetchUpstream(
	url: string | URL,
	{ timeoutMs = 10_000, name = "upstream" } = {},
): Promise<{ ok: true; data: unknown } | { ok: false; response: Response }> {
	let res: Response;
	try {
		res = await fetch(url, {
			signal: AbortSignal.timeout(timeoutMs),
			headers: { "user-agent": USER_AGENT },
		});
	} catch {
		return { ok: false, response: jsonError(`${name} request failed`, 502) };
	}
	if (!res.ok) {
		return {
			ok: false,
			response: jsonError(`${name} responded ${res.status}`, 502),
		};
	}
	return { ok: true, data: await res.json() };
}
