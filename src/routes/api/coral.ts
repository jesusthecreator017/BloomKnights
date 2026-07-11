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

// NOAA Coral Reef Watch bleaching alert area, 0=none .. 4=alert level 2
const ALERT_LABELS = [
	"No Stress",
	"Watch",
	"Warning",
	"Alert Level 1",
	"Alert Level 2",
];

interface ErddapResponse {
	table?: { rows?: Array<[string, number, number, number]> };
}

export const Route = createFileRoute("/api/coral")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const coords = parseLatLng(new URL(request.url));
				if (!coords) return jsonError("valid lat and lng are required", 400);

				// griddap point query at the nearest 5km grid cell, latest time
				const base =
					"https://coastwatch.noaa.gov/erddap/griddap/noaacrwbaa7dDaily.json";
				const query = `bleaching_alert_area[(last)][(${coords.lat})][(${coords.lng})]`;
				const upstream = `${base}?${encodeURIComponent(query)}`;

				const result = await fetchUpstream(upstream, {
					name: "NOAA Coral Reef Watch",
					cacheKey: geoCacheKey("coral", coords.lat, coords.lng),
					ttlMs: TTL.daily,
				});
				if (!result.ok) return result.response;

				const row = (result.data as ErddapResponse).table?.rows?.[0];
				if (!row) {
					return Response.json(
						{ available: false, reason: "no coral data at this location" },
						{ headers: { "cache-control": "public, max-age=3600" } },
					);
				}
				const [time, lat, lng, alertArea] = row;
				return Response.json(
					{
						available: true,
						time,
						lat,
						lng,
						alertArea,
						alertLabel: ALERT_LABELS[alertArea] ?? "Unknown",
					},
					{ headers: { "cache-control": "public, max-age=3600" } },
				);
			},
		},
	},
});
