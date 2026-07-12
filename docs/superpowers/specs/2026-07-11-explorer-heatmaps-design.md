# Explorer heatmap layers — design

Date: 2026-07-11. Approved by Jesus in-session.

## Goal

Add four toggleable heatmap overlays to the Explorer tab (`/explorer`): Air
Quality, UV Index, Recycling/Charging/Waste density, and Marine Life
sighting density. `/map` is untouched — this is additive to Explorer's
existing single-point layer picker (click/search a point → stats panel),
not a replacement for it.

## 1. Backend

**New: `GET /api/heatmap?metric=air-quality|uv-index&lat=&lng=`**

Samples a fixed 8×8 grid (64 points) across a ~0.5°-half-span box (~50km,
matching the existing `/api/marine-life` bbox convention) centered on
`lat`/`lng`. Open-Meteo's forecast APIs accept comma-separated
`latitude`/`longitude` lists and return one array entry per point in the
same order — confirmed live:
`curl "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=40.0,40.1&longitude=-74.0,-74.1&current=us_aqi"`
returns a 2-element array, one object per coordinate pair. So the whole
grid is **one upstream call**, not 64 — a pure `buildGrid(lat, lng)`
function generates the 64 coordinate pairs, they're joined into the
comma-separated params, and the single response array is zipped back
against the grid by index. Cached under one key
(`geoCacheKey("heatmap:" + metric, lat, lng)`, `TTL.weather`) exactly like
the existing single-point endpoints, using the same `fetchUpstream`/`cached`
helpers in `src/lib/api-utils.ts`. Grid size and span are fixed constants,
not query params — no new abuse surface.

Response: `{ metric: "air-quality" | "uv-index", points: {lat, lng, value}[] }`
(points with a null upstream value are dropped, matching how the
single-point endpoints already treat missing data).

**Modified: `GET /api/marine-life`** — the OBIS upstream response already
includes `decimalLatitude`/`decimalLongitude` per record, but the current
handler discards them while aggregating into the `species` count list.
Add a sibling `points: {lat, lng}[]` field with every record's coordinates
(same up-to-200-record upstream cap already in place) alongside the
existing `species` array, which is unchanged — no consumer of the current
response shape breaks.

**Unchanged: `GET /api/places`** — already returns `lat`/`lng` per place.
The Recycling/Charging/Waste density heatmap needs zero backend changes,
just a new client-side rendering mode over data already being fetched.

## 2. Frontend

**Library:** Google Maps' `visualization` library, via
`@react-google-maps/api`'s `HeatmapLayerF` component (already an installed
dependency, `HeatmapLayerF` confirmed present in its type defs — just needs
`libraries: ["visualization"]` added to Explorer's `useJsApiLoader` call).

**Trigger:** the existing "Search here" button — no auto-refresh on
pan/zoom, so dragging the map never fires a request storm. Toggling a
heatmap checkbox on for the first time (before any "Search here" click)
also triggers one fetch for the current center, then stays in sync with
subsequent "Search here" clicks like the existing single-point layers do.

**UI:** one checkbox per applicable layer tab in `LayerPanel`
(`src/components/layer-panel.tsx`) — "Show heatmap" next to Air Quality, UV
& Solar, Places, and Ocean & Reef (marine life). Checking it renders the
`HeatmapLayerF` on the map *in addition to* whatever that layer's existing
point-detail panel already shows — they coexist, not mutually exclusive.

**Weighting & gradient:** `air-quality`/`uv-index` points feed `weight:
value` into `WeightedLocation`; `places`/`marine-life` points feed weight-1
(pure density, no magnitude). All four use a shared custom gradient array
(transparent → green → yellow → red) passed via `HeatmapLayerOptions.gradient`
so the visual reads consistently with the rest of the app's AQI color
language, even though Google's heatmap blends by density/weight rather than
mapping one exact color per cell (the tradeoff explicitly chosen over a
precise colored-grid approach).

## 3. Files touched

New:
- `src/routes/api/heatmap.ts` — thin handler
- `src/lib/heatmap.ts` — `buildGrid(lat, lng): {lat,lng}[]` (pure) +
  `zipHeatmapPoints(grid, rawResults, field): {lat,lng,value}[]` (pure,
  drops nulls) — both unit-tested

Modified:
- `src/routes/api/marine-life.ts` — add `points` field
- `src/lib/api-types.ts` — new `HeatmapResponse`; `MarineLifeResponse` gains
  `points: {lat, lng}[]`
- `src/hooks/use-environment-layers.ts` — new heatmap queries, gated by a
  `showHeatmap` flag per layer, keyed by search point + metric
- `src/components/explorer-map.tsx` — `libraries: ["visualization"]`,
  `HeatmapLayerF` rendering, heatmap toggle state
- `src/components/layer-panel.tsx` — "Show heatmap" checkbox per applicable
  layer, wired to the new toggle state
- `FRONTEND_HANDOFF.md` — document the new endpoint + the `marine-life`
  response addition (API surface changed, per this repo's CLAUDE.md rule)

## Out of scope

- `/map` page is untouched.
- No new query params for grid size/span — fixed constants.
- No auto-refresh on pan/zoom.
- Ocean/reef bleaching-alert heatmap (multiple nearby reef points) was
  proposed during brainstorming but dropped from scope — not one of the
  four layers approved.
