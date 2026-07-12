# Explorer Heatmap Layers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four toggleable heatmap overlays (Air Quality, UV Index, Places density, Marine Life density) to the Explorer tab's Google Map, each a checkbox next to its matching existing layer tab.

**Architecture:** One new backend endpoint (`/api/heatmap`) does a single batched Open-Meteo call across a fixed 8×8 grid (Open-Meteo accepts comma-separated lat/lng lists and returns one array entry per point, confirmed live) instead of 64 separate calls. `/api/marine-life` gains a `points` field by exposing coordinates OBIS already returns but the handler previously discarded. `/api/places` needs no backend change — it already returns per-place coordinates. On the frontend, Google Maps' `visualization` library (`HeatmapLayerF` from the already-installed `@react-google-maps/api`) renders all four as weighted-point heatmaps, triggered by the existing "Search here" button — no auto-refresh on pan/zoom.

**Tech Stack:** TanStack Start, Bun, Vitest, `@react-google-maps/api` (Google Maps JS `visualization` library), TanStack Query.

## Global Constraints

- Grid is a fixed 8×8 (64 points) in a ~0.5°-half-span box (~50km) — no query params for size/span, no new abuse surface.
- The whole grid is ONE upstream HTTP call (comma-joined lat/lng lists), not 64 — confirmed working: `curl "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=40.0,40.1&longitude=-74.0,-74.1&current=us_aqi"` returns a 2-element array in input order.
- Cache the batched response under one key via the existing `geoCacheKey`/`cached`/`fetchUpstream` helpers in `src/lib/api-utils.ts`, same `TTL.weather` (30 min) as the single-point endpoints.
- `/map` (the MapLibre page, `src/components/live-map.tsx`) is untouched — this entire feature is Explorer-only (`src/components/explorer-map.tsx`).
- No auto-refresh on pan/zoom — heatmap data (re)fetches only via the existing "Search here" button (or first-toggle-on), exactly like the existing single-point layers already behave.
- Points with a missing/null upstream value are dropped, not defaulted to 0.
- Run `bun run lint:fix && bun run typecheck && set -a; source .env; set +a; bun run test && bun run build` before considering any task done.

---

### Task 1: Heatmap grid pure functions + `/api/heatmap` route

**Files:**
- Create: `src/lib/heatmap.ts`
- Create: `src/routes/api/heatmap.ts`
- Modify: `src/lib/api-types.ts` (add `HeatmapPoint`, `HeatmapResponse`)
- Test: `src/tests/heatmap.test.ts`

**Interfaces:**
- Consumes: `fetchUpstream`, `geoCacheKey`, `jsonError`, `parseLatLng`, `TTL` from `src/lib/api-utils.ts` (already exist, do not modify).
- Produces: `buildGrid(lat: number, lng: number): {lat: number; lng: number}[]`, `zipHeatmapPoints(grid: {lat: number; lng: number}[], rawResults: unknown[], field: string): {lat: number; lng: number; value: number}[]` — both pure, exported from `src/lib/heatmap.ts`. `HeatmapPoint {lat: number; lng: number; value: number}` and `HeatmapResponse {metric: "air-quality" | "uv-index"; points: HeatmapPoint[]}` exported from `src/lib/api-types.ts` — consumed by Task 4.

- [ ] **Step 1: Write the failing tests**

Create `src/tests/heatmap.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildGrid, zipHeatmapPoints } from "../lib/heatmap";

describe("buildGrid", () => {
	it("returns 64 points (8x8) centered on the input", () => {
		const grid = buildGrid(40, -74);
		expect(grid).toHaveLength(64);
	});

	it("spans roughly +/- 0.5 degrees around the center", () => {
		const grid = buildGrid(40, -74);
		const lats = grid.map((p) => p.lat);
		const lngs = grid.map((p) => p.lng);
		expect(Math.min(...lats)).toBeCloseTo(39.5, 5);
		expect(Math.max(...lats)).toBeCloseTo(40.5, 5);
		expect(Math.min(...lngs)).toBeCloseTo(-74.5, 5);
		expect(Math.max(...lngs)).toBeCloseTo(-73.5, 5);
	});
});

describe("zipHeatmapPoints", () => {
	const grid = [
		{ lat: 40, lng: -74 },
		{ lat: 40.1, lng: -74.1 },
		{ lat: 40.2, lng: -74.2 },
	];

	it("pairs each grid point with its current[field] value", () => {
		const raw = [
			{ current: { us_aqi: 42 } },
			{ current: { us_aqi: 88 } },
			{ current: { us_aqi: 15 } },
		];
		expect(zipHeatmapPoints(grid, raw, "us_aqi")).toEqual([
			{ lat: 40, lng: -74, value: 42 },
			{ lat: 40.1, lng: -74.1, value: 88 },
			{ lat: 40.2, lng: -74.2, value: 15 },
		]);
	});

	it("drops points with a missing or null value", () => {
		const raw = [
			{ current: { us_aqi: 42 } },
			{ current: { us_aqi: null } },
			{ current: {} },
		];
		expect(zipHeatmapPoints(grid, raw, "us_aqi")).toEqual([
			{ lat: 40, lng: -74, value: 42 },
		]);
	});

	it("drops points where the raw entry itself is missing", () => {
		const raw = [{ current: { us_aqi: 42 } }];
		expect(zipHeatmapPoints(grid, raw, "us_aqi")).toEqual([
			{ lat: 40, lng: -74, value: 42 },
		]);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `set -a; source .env; set +a; bun run test src/tests/heatmap.test.ts`
Expected: FAIL — `Cannot find module '../lib/heatmap'`

- [ ] **Step 3: Write `src/lib/heatmap.ts`**

```ts
export interface GridPoint {
	lat: number;
	lng: number;
}

const GRID_SIZE = 8;
const HALF_SPAN_DEG = 0.5;

/** Pure — an 8x8 grid of points in a ~1deg-wide box centered on (lat, lng). */
export function buildGrid(lat: number, lng: number): GridPoint[] {
	const points: GridPoint[] = [];
	const step = (HALF_SPAN_DEG * 2) / (GRID_SIZE - 1);
	for (let i = 0; i < GRID_SIZE; i++) {
		for (let j = 0; j < GRID_SIZE; j++) {
			points.push({
				lat: lat - HALF_SPAN_DEG + i * step,
				lng: lng - HALF_SPAN_DEG + j * step,
			});
		}
	}
	return points;
}

export interface HeatmapPointValue {
	lat: number;
	lng: number;
	value: number;
}

/**
 * Pure — zips a grid against Open-Meteo's batched response array (same
 * order as the grid, per Open-Meteo's documented comma-separated-coords
 * behavior) and extracts one `current.<field>` value per point. Points
 * with a missing/null value are dropped.
 */
export function zipHeatmapPoints(
	grid: GridPoint[],
	rawResults: unknown[],
	field: string,
): HeatmapPointValue[] {
	const out: HeatmapPointValue[] = [];
	for (let i = 0; i < grid.length; i++) {
		const entry = rawResults[i] as
			| { current?: Record<string, unknown> }
			| undefined;
		const value = entry?.current?.[field];
		if (typeof value !== "number") continue;
		out.push({ lat: grid[i].lat, lng: grid[i].lng, value });
	}
	return out;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `set -a; source .env; set +a; bun run test src/tests/heatmap.test.ts`
Expected: PASS, 5 tests

- [ ] **Step 5: Add the response types to `src/lib/api-types.ts`**

Append at the end of the file:

```ts
export interface HeatmapPoint {
	lat: number;
	lng: number;
	value: number;
}

export interface HeatmapResponse {
	metric: "air-quality" | "uv-index";
	points: HeatmapPoint[];
}
```

- [ ] **Step 6: Write `src/routes/api/heatmap.ts`**

```ts
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
```

- [ ] **Step 7: Typecheck**

Run: `bun run typecheck`
Expected: no errors

- [ ] **Step 8: Manual smoke test**

Start the dev server (`bun run dev`) and curl the new endpoint (port may be 3000 or 3001):

```bash
curl -s "http://localhost:3000/api/heatmap?metric=air-quality&lat=40.71&lng=-74.0" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['metric'], len(d['points']), d['points'][0])"
```

Expected: prints `air-quality 64 {'lat': ..., 'lng': ..., 'value': <a number>}` (point count may be slightly under 64 if any grid cell's upstream value was null, which is fine per the drop-nulls behavior). Also try `metric=uv-index` and confirm it works, and `metric=bogus` returns a 400.

- [ ] **Step 9: Commit**

```bash
git add src/lib/heatmap.ts src/routes/api/heatmap.ts src/lib/api-types.ts src/tests/heatmap.test.ts
git commit -m "Add /api/heatmap: batched grid sampling for AQI/UV heatmaps"
```

---

### Task 2: Marine-life aggregation extraction + `points` field

**Files:**
- Create: `src/lib/marine-life.ts`
- Modify: `src/routes/api/marine-life.ts` (full-file replace)
- Modify: `src/lib/api-types.ts` (add `points` to `MarineLifeResponse`)
- Test: `src/tests/marine-life.test.ts`

**Interfaces:**
- Produces: `aggregateObisResults(results: ObisRecord[]): {species: MarineSpeciesCount[]; points: {lat: number; lng: number}[]}` from `src/lib/marine-life.ts`, and `ObisRecord {scientificName?: string; vernacularName?: string; decimalLatitude?: number; decimalLongitude?: number}` — consumed only by the route in this same task. `MarineLifeResponse.points: {lat: number; lng: number}[]` in `src/lib/api-types.ts` — consumed by Task 6 (explorer-map.tsx).

- [ ] **Step 1: Write the failing tests**

Create `src/tests/marine-life.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { aggregateObisResults } from "../lib/marine-life";

describe("aggregateObisResults", () => {
	it("counts sightings per species and sorts descending", () => {
		const results = [
			{
				scientificName: "Lucania parva",
				decimalLatitude: 25.7,
				decimalLongitude: -80.1,
			},
			{
				scientificName: "Lucania parva",
				decimalLatitude: 25.8,
				decimalLongitude: -80.2,
			},
			{
				scientificName: "Fundulus grandis",
				decimalLatitude: 25.9,
				decimalLongitude: -80.3,
			},
		];
		const { species } = aggregateObisResults(results);
		expect(species).toEqual([
			{ name: "Lucania parva", count: 2 },
			{ name: "Fundulus grandis", count: 1 },
		]);
	});

	it("caps species at the top 25 by count", () => {
		const results = Array.from({ length: 30 }, (_, i) => ({
			scientificName: `Species ${i}`,
			decimalLatitude: 1,
			decimalLongitude: 1,
		}));
		const { species } = aggregateObisResults(results);
		expect(species).toHaveLength(25);
	});

	it("collects every record's coordinates into points, regardless of species name", () => {
		const results = [
			{ decimalLatitude: 25.7, decimalLongitude: -80.1 },
			{ scientificName: "X", decimalLatitude: 26, decimalLongitude: -81 },
		];
		const { points } = aggregateObisResults(results);
		expect(points).toEqual([
			{ lat: 25.7, lng: -80.1 },
			{ lat: 26, lng: -81 },
		]);
	});

	it("skips points with missing or non-numeric coordinates", () => {
		const results = [
			{ scientificName: "X" },
			{ scientificName: "Y", decimalLatitude: 1, decimalLongitude: undefined },
		];
		const { points } = aggregateObisResults(results);
		expect(points).toEqual([]);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `set -a; source .env; set +a; bun run test src/tests/marine-life.test.ts`
Expected: FAIL — `Cannot find module '../lib/marine-life'`

- [ ] **Step 3: Write `src/lib/marine-life.ts`**

```ts
export interface ObisRecord {
	scientificName?: string;
	vernacularName?: string;
	decimalLatitude?: number;
	decimalLongitude?: number;
}

export interface MarineSpeciesCount {
	name: string;
	common?: string;
	count: number;
}

export interface AggregatedMarineLife {
	species: MarineSpeciesCount[];
	points: { lat: number; lng: number }[];
}

/** Pure — top-25 species by sighting count, plus every valid record's raw coordinates. */
export function aggregateObisResults(
	results: ObisRecord[],
): AggregatedMarineLife {
	const counts = new Map<string, MarineSpeciesCount>();
	const points: { lat: number; lng: number }[] = [];

	for (const r of results) {
		if (
			typeof r.decimalLatitude === "number" &&
			typeof r.decimalLongitude === "number"
		) {
			points.push({ lat: r.decimalLatitude, lng: r.decimalLongitude });
		}
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

	return { species, points };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `set -a; source .env; set +a; bun run test src/tests/marine-life.test.ts`
Expected: PASS, 4 tests

- [ ] **Step 5: Add `points` to `MarineLifeResponse` in `src/lib/api-types.ts`**

Change:

```ts
export interface MarineLifeResponse {
	total: number;
	sampled: number;
	species: MarineSpecies[];
}
```

to:

```ts
export interface MarineLifeResponse {
	total: number;
	sampled: number;
	species: MarineSpecies[];
	points: { lat: number; lng: number }[];
}
```

- [ ] **Step 6: Replace the full contents of `src/routes/api/marine-life.ts`**

```ts
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
```

- [ ] **Step 7: Typecheck**

Run: `bun run typecheck`
Expected: no errors

- [ ] **Step 8: Manual smoke test**

With the dev server running:

```bash
curl -s "http://localhost:3000/api/marine-life?lat=25.76&lng=-80.19" | python3 -c "import sys,json; d=json.load(sys.stdin); print('species:', len(d['species']), 'points:', len(d['points']), d['points'][0] if d['points'] else None)"
```

Expected: `species` and `points` both present, `points` non-empty for a coastal location like Miami.

- [ ] **Step 9: Commit**

```bash
git add src/lib/marine-life.ts src/routes/api/marine-life.ts src/lib/api-types.ts src/tests/marine-life.test.ts
git commit -m "Add per-sighting coordinates to /api/marine-life for heatmap use"
```

---

### Task 3: `use-environment-layers` heatmap query

**Files:**
- Modify: `src/hooks/use-environment-layers.ts` (full-file replace)

**Interfaces:**
- Consumes: `HeatmapResponse` from `src/lib/api-types.ts` (Task 1).
- Produces: `HEATMAP_LAYERS: Set<EnvironmentLayer>` (which layer tabs get a heatmap checkbox), `useEnvironmentLayers(center, layer, placeKind, heatmapEnabled = false)` — new 4th param, return value gains `heatmap: HeatmapResponse | undefined` — consumed by Tasks 4 and 5.

No test for this task — it's a thin TanStack Query wiring layer over an already-tested pure `zipHeatmapPoints`/route (Task 1) and the repo's `vitest.config.ts` only picks up `src/tests/**/*.test.ts`, not hook/component tests (matches this repo's established convention — see e.g. the resources-page charts, which also had no component-level tests). Verified via Task 6's manual smoke test instead.

- [ ] **Step 1: Replace the full contents of `src/hooks/use-environment-layers.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchJson, roundCoord } from "#/lib/api-client";
import type {
	AirQualityResponse,
	CoralResponse,
	HeatmapResponse,
	OceanResponse,
	PlaceKind,
	PlacesResponse,
	UvSolarResponse,
} from "#/lib/api-types";

export type EnvironmentLayer =
	| "air-quality"
	| "uv-solar"
	| "ocean-coral"
	| "places";

export const ENVIRONMENT_LAYERS: { id: EnvironmentLayer; label: string }[] = [
	{ id: "air-quality", label: "Air Quality" },
	{ id: "uv-solar", label: "UV & Solar" },
	{ id: "ocean-coral", label: "Ocean & Reef" },
	{ id: "places", label: "Places" },
];

/** Layers that offer a "Show heatmap" toggle in LayerPanel. */
export const HEATMAP_LAYERS = new Set<EnvironmentLayer>([
	"air-quality",
	"uv-solar",
	"places",
	"ocean-coral",
]);

const STALE_TIME = 5 * 60 * 1000;

/** Maps a layer to its /api/heatmap `metric` value, for the two layers that use it. */
const HEATMAP_METRIC: Partial<
	Record<EnvironmentLayer, "air-quality" | "uv-index">
> = {
	"air-quality": "air-quality",
	"uv-solar": "uv-index",
};

/** Ambient environment data for whatever point the map is centered on, shared by Map and Explorer. */
export function useEnvironmentLayers(
	center: { lat: number; lng: number },
	layer: EnvironmentLayer,
	placeKind: PlaceKind,
	heatmapEnabled = false,
) {
	const key = { lat: roundCoord(center.lat), lng: roundCoord(center.lng) };
	const q = `lat=${key.lat}&lng=${key.lng}`;

	const air = useQuery({
		queryKey: ["air-quality", key],
		queryFn: () => fetchJson<AirQualityResponse>(`/api/air-quality?${q}`),
		enabled: layer === "air-quality",
		staleTime: STALE_TIME,
	});

	const uvSolar = useQuery({
		queryKey: ["uv-solar", key],
		queryFn: () => fetchJson<UvSolarResponse>(`/api/uv-solar?${q}`),
		enabled: layer === "uv-solar",
		staleTime: STALE_TIME,
	});

	const ocean = useQuery({
		queryKey: ["ocean", key],
		queryFn: () => fetchJson<OceanResponse>(`/api/ocean?${q}`),
		enabled: layer === "ocean-coral",
		staleTime: STALE_TIME,
	});

	const coral = useQuery({
		queryKey: ["coral", key],
		queryFn: () => fetchJson<CoralResponse>(`/api/coral?${q}`),
		enabled: layer === "ocean-coral",
		staleTime: STALE_TIME,
	});

	const places = useQuery({
		queryKey: ["places", key, placeKind],
		queryFn: () =>
			fetchJson<PlacesResponse>(`/api/places?${q}&kind=${placeKind}`),
		enabled: layer === "places",
		staleTime: STALE_TIME,
	});

	const heatmapMetric = heatmapEnabled ? HEATMAP_METRIC[layer] : undefined;
	const heatmap = useQuery({
		queryKey: ["heatmap", heatmapMetric, key],
		queryFn: () =>
			fetchJson<HeatmapResponse>(`/api/heatmap?metric=${heatmapMetric}&${q}`),
		enabled: heatmapMetric !== undefined,
		staleTime: STALE_TIME,
	});

	return {
		air: air.data,
		uvSolar: uvSolar.data,
		ocean: ocean.data,
		coral: coral.data,
		places: places.data,
		heatmap: heatmap.data,
	};
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: no errors. (`src/components/explorer-map.tsx` calls `useEnvironmentLayers` with only 3 args today — the new 4th param has a default of `false`, so this compiles unchanged until Task 6 updates the call site.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-environment-layers.ts
git commit -m "Add heatmap query and HEATMAP_LAYERS to useEnvironmentLayers"
```

---

### Task 4: `LayerPanel` heatmap checkbox

**Files:**
- Modify: `src/components/layer-panel.tsx`

**Interfaces:**
- Consumes: `HEATMAP_LAYERS` from `src/hooks/use-environment-layers.ts` (Task 3).
- Produces: `LayerPanelProps` gains `heatmapEnabled: boolean` and `onHeatmapToggle: (enabled: boolean) => void` — consumed by Task 6.

No test for this task — presentational component, matches this repo's established no-component-test convention (see Task 3's rationale).

- [ ] **Step 1: Add the `Flame` icon import**

In `src/components/layer-panel.tsx`, change:

```ts
import { BatteryCharging, Fish, Recycle, Trash2, Wind, X } from "lucide-react";
```

to:

```ts
import {
	BatteryCharging,
	Fish,
	Flame,
	Recycle,
	Trash2,
	Wind,
	X,
} from "lucide-react";
```

- [ ] **Step 2: Import `HEATMAP_LAYERS`**

Change:

```ts
import {
	ENVIRONMENT_LAYERS,
	type EnvironmentLayer,
} from "#/hooks/use-environment-layers";
```

to:

```ts
import {
	ENVIRONMENT_LAYERS,
	HEATMAP_LAYERS,
	type EnvironmentLayer,
} from "#/hooks/use-environment-layers";
```

- [ ] **Step 3: Add the two new props**

In the `LayerPanelProps` interface, add after `onPlaceKindChange`:

```ts
	heatmapEnabled: boolean;
	onHeatmapToggle: (enabled: boolean) => void;
```

So the full interface reads:

```ts
interface LayerPanelProps {
	layer: EnvironmentLayer;
	onLayerChange: (layer: EnvironmentLayer) => void;
	placeKind: PlaceKind;
	onPlaceKindChange: (kind: PlaceKind) => void;
	heatmapEnabled: boolean;
	onHeatmapToggle: (enabled: boolean) => void;
	air?: AirQualityResponse;
	uvSolar?: UvSolarResponse;
	ocean?: OceanResponse;
	coral?: CoralResponse;
	places?: PlacesResponse;
	marineLife?: MarineLifeResponse;
	title?: string;
	onClearSelection?: () => void;
	askContext: AskGeminiRequest["context"];
}
```

- [ ] **Step 4: Destructure the new props**

Change the `export function LayerPanel({` destructuring to include `heatmapEnabled` and `onHeatmapToggle`:

```ts
export function LayerPanel({
	layer,
	onLayerChange,
	placeKind,
	onPlaceKindChange,
	heatmapEnabled,
	onHeatmapToggle,
	air,
	uvSolar,
	ocean,
	coral,
	places,
	marineLife,
	title,
	onClearSelection,
	askContext,
}: LayerPanelProps) {
```

- [ ] **Step 5: Render the checkbox**

Immediately after the closing `</GlassTabs>` tag (right before the `<div className="flex max-h-[42vh] w-[min(46rem,calc(100vw-2rem))] ...">` content box), insert:

```tsx
			{HEATMAP_LAYERS.has(layer) && (
				<label className="mb-3 flex w-fit cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm text-white/80 shadow-lg backdrop-blur-xl">
					<input
						type="checkbox"
						checked={heatmapEnabled}
						onChange={(e) => onHeatmapToggle(e.target.checked)}
						className="h-4 w-4 rounded border-white/30 bg-transparent accent-forest-500"
					/>
					<Flame className="h-3.5 w-3.5 text-forest-400" /> Show heatmap
				</label>
			)}
```

- [ ] **Step 6: Typecheck**

Run: `bun run typecheck`
Expected: FAILS — `src/components/explorer-map.tsx` doesn't pass `heatmapEnabled`/`onHeatmapToggle` yet. This is expected; Task 6 fixes the call site. Confirm the ONLY error is in `explorer-map.tsx` about the two missing props (nothing else broken in `layer-panel.tsx` itself).

- [ ] **Step 7: Commit**

```bash
git add src/components/layer-panel.tsx
git commit -m "Add heatmap toggle checkbox to LayerPanel"
```

---

### Task 5: `explorer-map.tsx` — heatmap rendering and toggle state

**Files:**
- Modify: `src/components/explorer-map.tsx` (full-file replace)

**Interfaces:**
- Consumes: `HEATMAP_LAYERS`, `useEnvironmentLayers(center, layer, placeKind, heatmapEnabled)` returning `{..., heatmap?: HeatmapResponse}` (Task 3); `heatmapEnabled`/`onHeatmapToggle` props on `LayerPanel` (Task 4); `MarineLifeResponse.points` (Task 2); `HeatmapLayerF` from `@react-google-maps/api` (already installed).
- Produces: the `/explorer` page — nothing downstream depends on this file's internals.

This fixes the typecheck failure left at the end of Task 4.

No test for this task — same rationale as Tasks 3 and 4. Verified by the manual smoke test in Step 3 below plus the full quality gates in Task 6.

- [ ] **Step 1: Replace the full contents of `src/components/explorer-map.tsx`**

```tsx
import {
	GoogleMap,
	HeatmapLayerF,
	Marker,
	useJsApiLoader,
} from "@react-google-maps/api";
import { useQuery } from "@tanstack/react-query";
import { Crosshair, LocateFixed, Search } from "lucide-react";
import { useRef, useState } from "react";
import { LayerPanel, PLACE_COLOR } from "#/components/layer-panel";
import { GlassInput } from "#/components/ui/glass-input";
import {
	type EnvironmentLayer,
	HEATMAP_LAYERS,
	useEnvironmentLayers,
} from "#/hooks/use-environment-layers";
import { ApiClientError, fetchJson } from "#/lib/api-client";
import type {
	MarineLifeResponse,
	PlaceAutocompleteResponse,
	PlaceDetailsResponse,
	PlaceKind,
	PlaceSuggestion,
} from "#/lib/api-types";
import { cn } from "#/lib/utils";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";
const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 };

// module-level constant: @react-google-maps/api warns/reloads the script if
// the libraries array isn't referentially stable across renders
const MAP_LIBRARIES: "visualization"[] = ["visualization"];

// green -> yellow -> red, matching the app's AQI color language elsewhere
const HEATMAP_GRADIENT = [
	"rgba(62, 189, 73, 0)",
	"rgba(62, 189, 73, 1)",
	"rgba(250, 204, 21, 1)",
	"rgba(239, 68, 68, 1)",
];

// dark, forest/navy-tinted map so it matches the rest of the app instead of
// stock Google Maps colors
const MAP_STYLE: google.maps.MapTypeStyle[] = [
	{ elementType: "geometry", stylers: [{ color: "#0f1b2e" }] },
	{ elementType: "labels.text.stroke", stylers: [{ color: "#050b16" }] },
	{ elementType: "labels.text.fill", stylers: [{ color: "#c7d3e3" }] },
	{
		featureType: "water",
		elementType: "geometry",
		stylers: [{ color: "#08132b" }],
	},
	{
		featureType: "landscape",
		elementType: "geometry",
		stylers: [{ color: "#12251c" }],
	},
	{
		featureType: "poi",
		elementType: "geometry",
		stylers: [{ color: "#16301f" }],
	},
	{
		featureType: "poi.park",
		elementType: "geometry",
		stylers: [{ color: "#1c3a24" }],
	},
	{
		featureType: "road",
		elementType: "geometry",
		stylers: [{ color: "#1c2f42" }],
	},
	{
		featureType: "road",
		elementType: "geometry.stroke",
		stylers: [{ color: "#142234" }],
	},
	{
		featureType: "administrative",
		elementType: "geometry.stroke",
		stylers: [{ color: "#2a4a6b" }],
	},
];

function MessageOverlay({ message }: { message: string }) {
	return (
		<div className="flex h-full w-full items-center justify-center bg-[#050b16] p-6 text-center text-sm text-white/50">
			{message}
		</div>
	);
}

function toWeightedLocations(
	points: { lat: number; lng: number; weight?: number }[],
): google.maps.visualization.WeightedLocation[] {
	return points.map((p) => ({
		location: new google.maps.LatLng(p.lat, p.lng),
		weight: p.weight ?? 1,
	}));
}

export default function ExplorerMap() {
	const [center, setCenter] = useState(DEFAULT_CENTER);
	const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
		null,
	);
	const [address, setAddress] = useState<string | undefined>();
	const [query, setQuery] = useState("");
	const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);
	const [locating, setLocating] = useState(false);
	const [layer, setLayer] = useState<EnvironmentLayer>("air-quality");
	const [placeKind, setPlaceKind] = useState<PlaceKind>("recycling");
	const [heatmapEnabled, setHeatmapEnabled] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const mapRef = useRef<google.maps.Map | null>(null);

	const { isLoaded, loadError } = useJsApiLoader({
		googleMapsApiKey: GOOGLE_MAPS_API_KEY,
		libraries: MAP_LIBRARIES,
	});

	const activePoint = marker ?? center;
	const layerData = useEnvironmentLayers(
		activePoint,
		layer,
		placeKind,
		heatmapEnabled,
	);
	const { data: marineLife } = useQuery({
		queryKey: ["marine-life", activePoint],
		queryFn: () =>
			fetchJson<MarineLifeResponse>(
				`/api/marine-life?lat=${activePoint.lat}&lng=${activePoint.lng}`,
			),
		enabled: layer === "ocean-coral",
	});

	function handleSearchHere() {
		const mapCenter = mapRef.current?.getCenter();
		if (!mapCenter) return;
		setCenter({ lat: mapCenter.lat(), lng: mapCenter.lng() });
	}

	function handleLocateMe() {
		if (!("geolocation" in navigator)) {
			setSearchError("Geolocation isn't available in this browser.");
			return;
		}
		setLocating(true);
		setSearchError(null);
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
				setCenter(point);
				setMarker(point);
				setAddress(undefined);
				setShowSuggestions(false);
				setLocating(false);
			},
			() => {
				setSearchError("Couldn't get your location — check permissions.");
				setLocating(false);
			},
			{ enableHighAccuracy: true, timeout: 10_000 },
		);
	}

	function handleQueryChange(value: string) {
		setQuery(value);
		setShowSuggestions(true);
		if (debounceRef.current) clearTimeout(debounceRef.current);

		if (value.trim().length < 3) {
			setSuggestions([]);
			setSearchError(null);
			return;
		}

		debounceRef.current = setTimeout(async () => {
			try {
				const res = await fetchJson<PlaceAutocompleteResponse>(
					`/api/geocode/autocomplete?input=${encodeURIComponent(value)}`,
				);
				setSuggestions(res.suggestions);
				setSearchError(null);
			} catch (err) {
				setSuggestions([]);
				setSearchError(
					err instanceof ApiClientError && err.status === 500
						? "Address search isn't configured yet — click the map instead."
						: "Search isn't available right now.",
				);
			}
		}, 300);
	}

	async function handleSelectSuggestion(placeId: string, text: string) {
		setShowSuggestions(false);
		setQuery(text);
		try {
			const place = await fetchJson<PlaceDetailsResponse>(
				`/api/geocode/place?id=${encodeURIComponent(placeId)}`,
			);
			setCenter({ lat: place.lat, lng: place.lng });
			setMarker({ lat: place.lat, lng: place.lng });
			setAddress(place.formattedAddress);
		} catch {
			setSearchError("Couldn't look up that place — try again.");
		}
	}

	function handleMapClick(e: google.maps.MapMouseEvent) {
		const lat = e.latLng?.lat();
		const lng = e.latLng?.lng();
		if (lat == null || lng == null) return;
		setMarker({ lat, lng });
		setCenter({ lat, lng });
		setAddress(undefined);
		setShowSuggestions(false);
	}

	function clearSelection() {
		setMarker(null);
		setAddress(undefined);
	}

	if (!GOOGLE_MAPS_API_KEY) {
		return (
			<MessageOverlay message="Add VITE_GOOGLE_MAPS_API_KEY to a .env.local file to enable the live map (see .env.example)." />
		);
	}
	if (loadError) {
		return (
			<MessageOverlay message="Google Maps failed to load. Check your API key and that the Maps JavaScript API is enabled." />
		);
	}
	if (!isLoaded) {
		return <MessageOverlay message="Loading map…" />;
	}

	const heatmapPoints: { lat: number; lng: number; weight?: number }[] =
		!heatmapEnabled || !HEATMAP_LAYERS.has(layer)
			? []
			: layer === "air-quality" || layer === "uv-solar"
				? (layerData.heatmap?.points ?? []).map((p) => ({
						lat: p.lat,
						lng: p.lng,
						weight: p.value,
					}))
				: layer === "places"
					? (layerData.places?.places ?? []).map((p) => ({
							lat: p.lat,
							lng: p.lng,
						}))
					: (marineLife?.points ?? []);

	return (
		<div className="relative h-full w-full">
			<GoogleMap
				mapContainerStyle={{ width: "100%", height: "100%" }}
				center={center}
				zoom={marker ? 13 : 4}
				onClick={handleMapClick}
				onLoad={(map) => {
					mapRef.current = map;
				}}
				options={{
					styles: MAP_STYLE,
					mapTypeControl: true,
					streetViewControl: true,
					fullscreenControl: true,
					zoomControl: true,
					clickableIcons: true,
				}}
			>
				{marker && <Marker position={marker} />}

				{layer === "places" &&
					!heatmapEnabled &&
					layerData.places?.places.map((place) => (
						<Marker
							key={place.id}
							position={{ lat: place.lat, lng: place.lng }}
							icon={{
								path: google.maps.SymbolPath.CIRCLE,
								scale: 7,
								fillColor: PLACE_COLOR[placeKind],
								fillOpacity: 1,
								strokeColor: "#050b16",
								strokeWeight: 1.5,
							}}
						/>
					))}

				{heatmapPoints.length > 0 && (
					<HeatmapLayerF
						data={toWeightedLocations(heatmapPoints)}
						options={{ gradient: HEATMAP_GRADIENT, radius: 40, opacity: 0.7 }}
					/>
				)}
			</GoogleMap>

			<LayerPanel
				layer={layer}
				onLayerChange={setLayer}
				placeKind={placeKind}
				onPlaceKindChange={setPlaceKind}
				heatmapEnabled={heatmapEnabled}
				onHeatmapToggle={setHeatmapEnabled}
				air={layerData.air}
				uvSolar={layerData.uvSolar}
				ocean={layerData.ocean}
				coral={layerData.coral}
				places={layerData.places}
				marineLife={marineLife}
				title={marker ? (address ?? "Selected location") : undefined}
				onClearSelection={marker ? clearSelection : undefined}
				askContext={{
					kind: "location",
					name: address,
					lat: activePoint.lat,
					lng: activePoint.lng,
					liveData:
						layerData.air?.current?.us_aqi != null
							? `AQI ${layerData.air.current.us_aqi}`
							: undefined,
				}}
			/>

			<div className="-translate-x-1/2 absolute top-4 left-1/2 z-10 flex w-[min(26rem,calc(100%-2rem))] flex-col gap-2">
				<div className="flex items-start gap-2">
					<div className="relative flex-1">
						<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/50" />
						<GlassInput
							value={query}
							onChange={(e) => handleQueryChange(e.target.value)}
							onFocus={() => setShowSuggestions(true)}
							onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
							placeholder="Search an address or click the map…"
							className="pl-9"
						/>

						{showSuggestions && (suggestions.length > 0 || searchError) && (
							<div className="absolute top-full right-0 left-0 z-10 mt-2 overflow-hidden rounded-xl border border-white/20 bg-slate-900/90 shadow-lg backdrop-blur-xl">
								{searchError ? (
									<p className="px-4 py-3 text-sm text-red-300">
										{searchError}
									</p>
								) : (
									suggestions.map((s) => (
										<button
											key={s.placeId}
											type="button"
											onMouseDown={() =>
												handleSelectSuggestion(s.placeId, s.text)
											}
											className="block w-full px-4 py-2.5 text-left text-sm text-white/80 transition hover:bg-white/10"
										>
											{s.text}
										</button>
									))
								)}
							</div>
						)}
					</div>
					<button
						type="button"
						onClick={handleLocateMe}
						disabled={locating}
						title="Use my location"
						aria-label="Use my location"
						className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/70 shadow-lg backdrop-blur-xl transition hover:bg-white/15 hover:text-white disabled:opacity-60"
					>
						<LocateFixed
							className={cn("h-4 w-4", locating && "animate-pulse")}
						/>
					</button>
				</div>

				{searchError && !showSuggestions && (
					<p className="self-center rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-red-200 text-xs shadow-lg backdrop-blur-xl">
						{searchError}
					</p>
				)}

				<button
					type="button"
					onClick={handleSearchHere}
					className="flex items-center justify-center gap-1.5 self-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-white/80 text-xs shadow-lg backdrop-blur-xl transition hover:bg-white/15 hover:text-white"
				>
					<Crosshair className="h-3.5 w-3.5" /> Search here
				</button>
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: no errors (this resolves the failure left at the end of Task 4)

- [ ] **Step 3: Manual smoke test**

Run `bun run dev`, open `http://localhost:3000/explorer` (or `:3001`) in a browser and verify:
- The "Air Quality" tab shows a "Show heatmap" checkbox; checking it renders a blended green/yellow/red heatmap layer over the map (may take a few seconds on first load — it's one Open-Meteo call for 64 points)
- Switching to "UV & Solar" keeps the checkbox checked and renders its own heatmap
- Switching to "Places" hides the individual place pins (since `heatmapEnabled` suppresses the marker loop) and shows a density heatmap instead; unchecking the box brings the pins back
- Switching to "Ocean & Reef" near a coastal point (e.g. search "Miami") and checking the box shows a marine-life sighting density heatmap
- Clicking "Search here" after panning refreshes the heatmap for the new area

- [ ] **Step 4: Commit**

```bash
git add src/components/explorer-map.tsx
git commit -m "Wire heatmap rendering and toggle state into ExplorerMap"
```

---

### Task 6: Docs + full quality gates

**Files:**
- Modify: `FRONTEND_HANDOFF.md`

- [ ] **Step 1: Document the new/changed endpoints**

In `FRONTEND_HANDOFF.md`, immediately after the `GET /api/places?...` section (find the line starting with `### \`GET /api/places?lat=&lng=&kind=recycling|charging|waste\``, and insert after that section's closing code block and before the next `###` heading), add:

```markdown
### `GET /api/heatmap?metric=air-quality|uv-index&lat=&lng=`
64-point grid sample (fixed ~50km box around the point) for a heatmap overlay — one upstream call, not 64. Feed `points` straight into a weighted heatmap layer (e.g. Google Maps' `visualization` library), weighting by `value`.
```json
{ "metric": "air-quality", "points": [ { "lat": 40.2, "lng": -74.5, "value": 42 }, ... ] }
```
`metric` must be exactly `air-quality` or `uv-index`; anything else is a 400. Points with no upstream value are dropped, so the array can be shorter than 64.
```

Then update the existing `GET /api/marine-life?lat=&lng=` section's response example to include the new `points` field. Find:

```markdown
### `GET /api/marine-life?lat=&lng=`
Marine species sightings near a point (OBIS), aggregated & sorted by count. `total` = all records in area, `species` = top 25.
```json
{ "total": 472918, "sampled": 200,
  "species": [ { "name": "Lucania parva", "common": "NA", "count": 9 }, ... ] }
```
Note `common` may be the string `"NA"` or missing — fall back to the scientific `name`.
```

Replace with:

```markdown
### `GET /api/marine-life?lat=&lng=`
Marine species sightings near a point (OBIS), aggregated & sorted by count. `total` = all records in area, `species` = top 25, `points` = every individual sighting's raw coordinates (up to 200) — use `points` for a density heatmap, `species` for a species list.
```json
{ "total": 472918, "sampled": 200,
  "species": [ { "name": "Lucania parva", "common": "NA", "count": 9 }, ... ],
  "points": [ { "lat": 25.77, "lng": -80.18 }, ... ] }
```
Note `common` may be the string `"NA"` or missing — fall back to the scientific `name`.
```

- [ ] **Step 2: Run the full quality gate suite**

Run: `bun run lint:fix`
Expected: no unfixable errors

Run: `bun run typecheck`
Expected: no errors

Run: `set -a; source .env; set +a; bun run test`
Expected: all tests pass, including the new `heatmap.test.ts` (5 tests) and `marine-life.test.ts` (4 tests)

Run: `bun run build`
Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add FRONTEND_HANDOFF.md
git commit -m "Document /api/heatmap and marine-life points field"
```

---

### Task 7: Open the PR

**Files:** none (process step)

- [ ] **Step 1: Push the branch**

Run: `git push -u origin explorer-heatmaps`

- [ ] **Step 2: Open the PR**

Run:
```bash
gh pr create --base main --title "Explorer heatmap layers: Air Quality, UV, Places, Marine Life" --body "$(cat <<'EOF'
## Summary
- Four new toggleable heatmap overlays on the Explorer tab: Air Quality, UV Index, Places density, Marine Life sighting density. `/map` is untouched.
- New `GET /api/heatmap?metric=air-quality|uv-index&lat=&lng=`: samples a fixed 8x8 grid (~50km box) in ONE batched Open-Meteo call (confirmed Open-Meteo accepts comma-separated lat/lng lists and returns results in the same order), cached the same way as the existing single-point endpoints.
- `GET /api/marine-life` gains a `points` field — the OBIS upstream response already included per-sighting coordinates, the handler just wasn't exposing them.
- `GET /api/places` needed no backend change — already returns per-place coordinates.
- Rendering uses Google Maps' `visualization` library (`HeatmapLayerF`), triggered by the existing "Search here" button — no auto-refresh on pan/zoom.
- Grid-sampling and marine-life aggregation logic are pure, unit-tested functions (`src/lib/heatmap.ts`, `src/lib/marine-life.ts`).

## Test plan
- [x] lint / typecheck / test / build all green
- [x] Manual smoke test: curl-verified /api/heatmap and /api/marine-life; browser-verified all four heatmap toggles render and "Search here" refreshes them

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Report the PR URL to the user**
