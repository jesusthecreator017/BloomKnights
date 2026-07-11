// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { emissionsCache } from "../../db/schema";
import { fetchUpstream, jsonError } from "../../lib/api-utils";

const TTL_MS = 24 * 60 * 60 * 1000; // Climate TRACE asks for low volume — cache 24h

export const Route = createFileRoute("/api/emissions")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const country = (
					url.searchParams.get("country") ?? "USA"
				).toUpperCase();
				if (!/^[A-Z]{3}$/.test(country)) {
					return jsonError("country must be an ISO-3 code, e.g. USA", 400);
				}

				const [cached] = await db
					.select()
					.from(emissionsCache)
					.where(eq(emissionsCache.country, country));
				if (cached && Date.now() - cached.fetchedAt.getTime() < TTL_MS) {
					return Response.json({ country, cached: true, data: cached.data });
				}

				const upstream = new URL(
					"https://api.climatetrace.org/v6/country/emissions",
				);
				upstream.searchParams.set("countries", country);
				const result = await fetchUpstream(upstream, { name: "Climate TRACE" });
				if (!result.ok) {
					// serve stale cache if upstream is down
					if (cached) {
						return Response.json({
							country,
							cached: true,
							stale: true,
							data: cached.data,
						});
					}
					return result.response;
				}

				await db
					.insert(emissionsCache)
					.values({
						country,
						data: result.data as object,
						fetchedAt: new Date(),
					})
					.onConflictDoUpdate({
						target: emissionsCache.country,
						set: { data: result.data as object, fetchedAt: new Date() },
					});

				return Response.json({ country, cached: false, data: result.data });
			},
		},
	},
});
