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

export const Route = createFileRoute("/api/ocean")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const coords = parseLatLng(new URL(request.url));
				if (!coords) return jsonError("valid lat and lng are required", 400);

				const upstream = new URL("https://marine-api.open-meteo.com/v1/marine");
				upstream.searchParams.set("latitude", String(coords.lat));
				upstream.searchParams.set("longitude", String(coords.lng));
				upstream.searchParams.set(
					"current",
					"sea_surface_temperature,wave_height,ocean_current_velocity",
				);
				upstream.searchParams.set("timezone", "auto");

				const result = await fetchUpstream(upstream, {
					name: "Open-Meteo Marine",
					cacheKey: geoCacheKey("ocean", coords.lat, coords.lng),
					ttlMs: TTL.weather,
				});
				if (!result.ok) return result.response;
				return Response.json(result.data, {
					headers: { "cache-control": "public, max-age=1800" },
				});
			},
		},
	},
});
