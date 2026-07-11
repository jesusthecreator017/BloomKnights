// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { fetchUpstream, TTL } from "../../lib/api-utils";
import { parseWeatherAlerts } from "../../lib/weather-alerts";

export const Route = createFileRoute("/api/weather-alerts")({
	server: {
		handlers: {
			GET: async () => {
				const result = await fetchUpstream(
					"https://api.weather.gov/alerts/active?area=FL",
					{
						name: "NOAA Weather Alerts",
						cacheKey: "weather-alerts:fl",
						ttlMs: TTL.weather,
					},
				);
				if (!result.ok) return result.response;

				const alerts = parseWeatherAlerts(
					result.data as Parameters<typeof parseWeatherAlerts>[0],
				);
				return Response.json(alerts, {
					headers: { "cache-control": "public, max-age=600" },
				});
			},
		},
	},
});
