# Resources page: categorized library + real charts — design

Date: 2026-07-11. Approved by Jesus in-session (conversational brainstorm).

## Goal

The Resources page is currently 6 hardcoded action cards + one hand-rolled
emissions bar section. Replace it with a categorized library of curated
resources (actions AND learning links, ~50 total) and upgrade every metric
display on the page to real charts (Recharts), following the repo's
`dataviz` skill method.

## 1. Categorized resource library

**Categories (7, fixed order):** Carbon & Emissions, Energy, Ocean & Water,
Waste & Recycling, Biodiversity & Land, Food, Air Quality.

**Entry shape** (`src/data/resources.json`, loaded by `src/lib/resources.ts`,
mirrors the `events.json`/`initiatives.json` pattern already in the repo —
static curated data, no API needed):

```ts
interface Resource {
  id: string;
  category: "carbon" | "energy" | "ocean" | "waste" | "biodiversity" | "food" | "air-quality";
  type: "action" | "article" | "org" | "data";
  title: string;
  description: string; // 1-2 sentences
  url: string;          // real external URL, or "/map" for the one internal action
  impact?: string;       // only for type: "action", e.g. "Up to 1.5 tons CO2/yr"
}
```

The 6 existing action cards are re-typed (`type: "action"`) and redistributed
into their matching category (e.g. "Join community solar" → energy). I then
write ~6-8 new `article`/`org`/`data` entries per category (real orgs,
articles, and data sources — EPA, NOAA, IEA, Our World in Data, etc., same
research bar as the events/initiatives data added previously) for ~50
resources total.

**Page UI:** category filter pills (All + 7) above a responsive card grid.
Each card shows a type badge (GlassBadge, color by type), title, description,
impact line (actions only), and an outbound link (or internal `/map` link for
the one action that points there). Filtering is client-side state — no new
endpoint.

## 2. Charts

New dependency: `recharts`. Three chart components under
`src/components/charts/`, each following the dataviz skill's procedure (form
→ color → marks → hover → accessibility):

**`emissions-bar-chart.tsx`** — replaces the hand-rolled `EmissionsBar` divs.
Horizontal bar, 2 categories (selected country vs rest-of-world), same data
source (`/api/emissions?country=`). Colors: `#1c9920` (country) / `#3d76d1`
(rest of world) — validated categorical pair, fixed order, matches the
existing app convention (forest = subject, navy = comparison).

**`emissions-donut.tsx`** — replaces the 3 flat `StatCard`s for CO2/CH4/N2O.
Donut chart, 3 fixed-order categorical slices: CO2 `#1c9920`, CH4 `#3d76d1`,
N2O `#c2790c` (this 5-color set — including 2 reserved slots for future
series — passes all 4 dataviz validator checks in dark mode: lightness band,
chroma floor, CVD separation, contrast). Values as a direct-labeled legend
beside the donut (tonnes formatted via existing `formatTonnesCo2e`), so
identity is never color-alone.

**`aqi-by-city-chart.tsx`** — new. Horizontal bar of all 26 seeded cities'
live AQI, sourced from the already-existing `/api/cities/scores` endpoint
(same data the leaderboard's Environmental Score tab uses — zero new backend
work). Each bar's color comes from the existing `aqiColor()` utility
(`src/lib/environment-format.ts`) — a magnitude gradient already shipped
elsewhere in the app, not a categorical assignment, so it's reused as-is
rather than re-derived through the categorical validator. Cities sorted
cleanest-first (matches the API's existing order).

**Shared chart conventions:** dark-surface-aware (no light-mode chart CSS —
app is dark-shell-only per `__root.tsx`), thin bars with rounded data-ends,
per-bar/per-slice hover tooltip (Recharts `<Tooltip>`), recessive gridlines,
no dual-axis anywhere. Each chart also renders inside a `GlassCard` so it
matches the rest of the page.

## 3. Files touched

New:
- `src/data/resources.json` — ~50 curated entries
- `src/lib/resources.ts` — typed loader + category metadata (label, icon)
- `src/components/charts/emissions-bar-chart.tsx`
- `src/components/charts/emissions-donut.tsx`
- `src/components/charts/aqi-by-city-chart.tsx`

Rewritten:
- `src/routes/resources.tsx` — category filter UI + card grid replacing the
  `actions` array/map; `EmissionsSection` swaps `EmissionsBar`/`StatCard` for
  the new chart components and adds the AQI-by-city chart.

Modified:
- `package.json` — add `recharts`

## Out of scope

- No UV chart (no bulk city UV endpoint exists yet; explicitly deferred by
  Jesus in-session).
- No backend/API changes — `/api/cities/scores` and `/api/emissions` already
  provide everything needed.
- The resources library is static curated content, not a candidate for the
  "kill hardcoded data" initiative from the live-data branch — there is no
  live API for "curated educational links," so this is intentional, same as
  `events.json`/`initiatives.json` remaining as fallbacks.
