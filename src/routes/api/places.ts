// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import {
	geoCacheKey,
	jsonError,
	parseLatLng,
	TTL,
	USER_AGENT,
} from "../../lib/api-utils";
import { cached } from "../../lib/cache";

// OSM tags per requested kind
const KIND_QUERY: Record<string, string> = {
	recycling: 'node["amenity"="recycling"]',
	charging: 'node["amenity"="charging_station"]',
	waste: 'node["amenity"="waste_transfer_station"]',
};

interface OverpassResponse {
	elements: Array<{
		id: number;
		lat: number;
		lon: number;
		tags?: Record<string, string>;
	}>;
}

export const Route = createFileRoute("/api/places")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const coords = parseLatLng(url);
				if (!coords) return jsonError("valid lat and lng are required", 400);
				const kind = url.searchParams.get("kind") ?? "recycling";
				const selector = KIND_QUERY[kind];
				if (!selector) {
					return jsonError(
						`kind must be one of: ${Object.keys(KIND_QUERY).join(", ")}`,
						400,
					);
				}

				const radius = 15000; // meters
				const ql = `[out:json][timeout:25];${selector}(around:${radius},${coords.lat},${coords.lng});out body 60;`;

				let data: OverpassResponse;
				try {
					data = await cached(
						`${geoCacheKey("places", coords.lat, coords.lng)}:${kind}`,
						TTL.rare,
						async () => {
							const res = await fetch(
								"https://overpass-api.de/api/interpreter",
								{
									method: "POST",
									body: `data=${encodeURIComponent(ql)}`,
									headers: {
										"content-type": "application/x-www-form-urlencoded",
										"user-agent": USER_AGENT,
									},
									signal: AbortSignal.timeout(30_000),
								},
							);
							if (!res.ok) throw new Error(`Overpass responded ${res.status}`);
							return res.json() as Promise<OverpassResponse>;
						},
					);
				} catch (err) {
					const message =
						err instanceof Error ? err.message : "Overpass request failed";
					return jsonError(message, 502);
				}

				const places = (data.elements ?? []).map((el) => ({
					id: el.id,
					name: el.tags?.name ?? `${kind} point`,
					lat: el.lat,
					lng: el.lon,
					kind,
				}));

				return Response.json(
					{ kind, count: places.length, places },
					{ headers: { "cache-control": "public, max-age=3600" } },
				);
			},
		},
	},
});
