// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import {
	fetchUpstream,
	geoCacheKey,
	jsonError,
	parseLatLng,
	TTL,
} from "../../lib/api-utils";

export const Route = createFileRoute("/api/air-quality")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const coords = parseLatLng(new URL(request.url));
				if (!coords)
					return jsonError("lat and lng query params are required", 400);

				const upstream = new URL(
					"https://air-quality-api.open-meteo.com/v1/air-quality",
				);
				upstream.searchParams.set("latitude", String(coords.lat));
				upstream.searchParams.set("longitude", String(coords.lng));
				upstream.searchParams.set(
					"current",
					"us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,ozone",
				);

				const result = await fetchUpstream(upstream, {
					name: "Open-Meteo",
					cacheKey: geoCacheKey("air-quality", coords.lat, coords.lng),
					ttlMs: TTL.weather,
				});
				if (!result.ok) return result.response;
				return Response.json(result.data, {
					headers: { "cache-control": "public, max-age=300" },
				});
			},
		},
	},
});
