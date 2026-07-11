// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { fetchUpstream, jsonError, parseLatLng } from "../../lib/api-utils";

interface ObisResponse {
	total: number;
	results: Array<{
		scientificName?: string;
		vernacularName?: string;
		decimalLatitude?: number;
		decimalLongitude?: number;
	}>;
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

				const result = await fetchUpstream(upstream, { name: "OBIS" });
				if (!result.ok) return result.response;

				const obis = result.data as ObisResponse;
				const counts = new Map<
					string,
					{ name: string; common?: string; count: number }
				>();
				for (const r of obis.results ?? []) {
					const name = r.scientificName;
					if (!name) continue;
					const entry = counts.get(name) ?? {
						name,
						common: r.vernacularName,
						count: 0,
					};
					entry.count += 1;
					counts.set(name, entry);
				}
				const species = [...counts.values()]
					.sort((a, b) => b.count - a.count)
					.slice(0, 25);

				return Response.json(
					{
						total: obis.total ?? 0,
						sampled: obis.results?.length ?? 0,
						species,
					},
					{ headers: { "cache-control": "public, max-age=3600" } },
				);
			},
		},
	},
});
