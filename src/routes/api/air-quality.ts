// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

const OPEN_METEO_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

export const Route = createFileRoute("/api/air-quality")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const latParam = url.searchParams.get("lat");
				const lngParam = url.searchParams.get("lng");
				const lat = latParam === null ? NaN : Number(latParam);
				const lng = lngParam === null ? NaN : Number(lngParam);

				if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
					return Response.json(
						{ error: "lat and lng query params are required" },
						{ status: 400 },
					);
				}

				const upstream = new URL(OPEN_METEO_URL);
				upstream.searchParams.set("latitude", String(lat));
				upstream.searchParams.set("longitude", String(lng));
				upstream.searchParams.set(
					"current",
					"us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,ozone",
				);

				const res = await fetch(upstream);
				if (!res.ok) {
					return Response.json(
						{ error: `Open-Meteo responded ${res.status}` },
						{ status: 502 },
					);
				}

				const data = await res.json();
				return Response.json(data, {
					headers: { "cache-control": "public, max-age=300" },
				});
			},
		},
	},
});
