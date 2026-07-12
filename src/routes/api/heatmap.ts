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
import { buildGrid, zipHeatmapPoints } from "../../lib/heatmap";

const METRICS = {
	"air-quality": {
		base: "https://air-quality-api.open-meteo.com/v1/air-quality",
		param: "us_aqi",
	},
	"uv-index": {
		base: "https://api.open-meteo.com/v1/forecast",
		param: "uv_index",
	},
} as const;

type Metric = keyof typeof METRICS;

function isMetric(value: string | null): value is Metric {
	return value === "air-quality" || value === "uv-index";
}

export const Route = createFileRoute("/api/heatmap")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const coords = parseLatLng(url);
				if (!coords) return jsonError("valid lat and lng are required", 400);

				const metricParam = url.searchParams.get("metric");
				if (!isMetric(metricParam)) {
					return jsonError("metric must be air-quality or uv-index", 400);
				}
				const metric = METRICS[metricParam];

				const grid = buildGrid(coords.lat, coords.lng);
				const upstream = new URL(metric.base);
				upstream.searchParams.set(
					"latitude",
					grid.map((p) => p.lat).join(","),
				);
				upstream.searchParams.set(
					"longitude",
					grid.map((p) => p.lng).join(","),
				);
				upstream.searchParams.set("current", metric.param);

				const result = await fetchUpstream(upstream, {
					name: "Open-Meteo",
					timeoutMs: 15_000,
					cacheKey: geoCacheKey(
						`heatmap:${metricParam}`,
						coords.lat,
						coords.lng,
					),
					ttlMs: TTL.weather,
				});
				if (!result.ok) return result.response;

				const points = zipHeatmapPoints(
					grid,
					result.data as unknown[],
					metric.param,
				);
				return Response.json(
					{ metric: metricParam, points },
					{ headers: { "cache-control": "public, max-age=300" } },
				);
			},
		},
	},
});
