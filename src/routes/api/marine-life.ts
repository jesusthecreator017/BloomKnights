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
import { aggregateObisResults, type ObisRecord } from "../../lib/marine-life";

interface ObisResponse {
	total: number;
	results: ObisRecord[];
}

export const Route = createFileRoute("/api/marine-life")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const coords = parseLatLng(new URL(request.url));
				if (!coords) return jsonError("valid lat and lng are required", 400);

				// ~0.5° bounding box (~50 km) as WKT polygon for the OBIS geometry filter
				const d = 0.5;
				const { lat, lng } = coords;
				const poly = `POLYGON((${lng - d} ${lat - d}, ${lng + d} ${lat - d}, ${lng + d} ${lat + d}, ${lng - d} ${lat + d}, ${lng - d} ${lat - d}))`;

				const upstream = new URL("https://api.obis.org/v3/occurrence");
				upstream.searchParams.set("geometry", poly);
				upstream.searchParams.set("size", "200");

				const result = await fetchUpstream(upstream, {
					name: "OBIS",
					cacheKey: geoCacheKey("marine-life", coords.lat, coords.lng),
					ttlMs: TTL.rare,
				});
				if (!result.ok) return result.response;

				const obis = result.data as ObisResponse;
				const { species, points } = aggregateObisResults(obis.results ?? []);

				return Response.json(
					{
						total: obis.total ?? 0,
						sampled: obis.results?.length ?? 0,
						species,
						points,
					},
					{ headers: { "cache-control": "public, max-age=3600" } },
				);
			},
		},
	},
});
