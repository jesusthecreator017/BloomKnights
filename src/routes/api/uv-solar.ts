// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { fetchUpstream, jsonError, parseLatLng } from "../../lib/api-utils";

export const Route = createFileRoute("/api/uv-solar")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const coords = parseLatLng(new URL(request.url));
				if (!coords) return jsonError("valid lat and lng are required", 400);

				const upstream = new URL("https://api.open-meteo.com/v1/forecast");
				upstream.searchParams.set("latitude", String(coords.lat));
				upstream.searchParams.set("longitude", String(coords.lng));
				upstream.searchParams.set("current", "uv_index,shortwave_radiation");
				upstream.searchParams.set(
					"daily",
					"uv_index_max,sunshine_duration,shortwave_radiation_sum",
				);
				upstream.searchParams.set("timezone", "auto");
				upstream.searchParams.set("forecast_days", "1");

				const result = await fetchUpstream(upstream, { name: "Open-Meteo" });
				if (!result.ok) return result.response;
				return Response.json(result.data, {
					headers: { "cache-control": "public, max-age=1800" },
				});
			},
		},
	},
});
