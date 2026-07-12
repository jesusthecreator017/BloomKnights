# Resources Library + Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Resources page's 6 hardcoded action cards + hand-rolled emissions bars with a categorized library of ~51 curated resources (actions + learning links, filterable by 7 categories) and real Recharts-based charts for every metric on the page.

**Architecture:** Static curated data (`src/data/resources.json`, same pattern as `events.json`/`initiatives.json`) loaded through a typed pure module (`src/lib/resources.ts`). Chart rendering is split from chart data-shaping: pure, unit-tested functions in `src/lib/chart-data.ts` produce plain arrays; thin Recharts components in `src/components/charts/` consume them. `src/routes/resources.tsx` is rewritten to add category-pill filtering and wire in the three new chart components, reusing the already-existing `/api/emissions` and `/api/cities/scores` (via `useCityScores()`) endpoints — no backend changes.

**Tech Stack:** React 19, TanStack Router/Query, Recharts (new dependency), Tailwind v4, Bun, Vitest.

## Global Constraints

- No backend/API changes — `/api/cities/scores` and `/api/emissions` already provide everything needed.
- Categorical chart colors are fixed and validated: `#1c9920` (forest/slot 1), `#3d76d1` (navy/slot 2), `#c2790c` (amber/slot 3) — assign in this exact order, never reassign per filter state.
- The AQI-by-city chart colors each bar via the existing `aqiColor()` utility (`src/lib/environment-format.ts`) — reuse it, do not reimplement.
- `resources.json` category values are exactly: `"carbon" | "energy" | "ocean" | "waste" | "biodiversity" | "food" | "air-quality"`. Type values are exactly: `"action" | "article" | "org" | "data"`.
- Internal links use the literal JSX `<Link to="/map">` (TanStack Router's typed routes reject a variable `string` in `to`) — never `<Link to={resource.url}>`.
- Run `bun run lint:fix && bun run typecheck && bun run test && bun run build` before considering any task done; this project's CI runs exactly those in that order.

---

### Task 1: Add Recharts dependency

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `recharts` package available for import in Tasks 3-5.

- [ ] **Step 1: Install the package**

Run: `bun add recharts`

- [ ] **Step 2: Verify it resolved**

Run: `grep '"recharts"' package.json`
Expected: a line like `"recharts": "^2.x.x",` (or whatever current major `bun add` resolves) under `dependencies`.

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "Add recharts dependency for resources page charts"
```

---

### Task 2: Chart data-shaping pure functions

**Files:**
- Create: `src/lib/chart-data.ts`
- Test: `src/tests/chart-data.test.ts`

**Interfaces:**
- Consumes: `EmissionsEntry`, `CityScore` from `src/lib/api-types.ts` (already exist); `aqiColor` from `src/lib/environment-format.ts` (already exists).
- Produces:
  - `emissionsBarData(entry: EmissionsEntry, countryLabel: string): EmissionsBarDatum[]`
  - `emissionsDonutData(entry: EmissionsEntry): EmissionsDonutDatum[]`
  - `cityAqiChartData(scores: CityScore[]): CityAqiDatum[]`
  - Types `EmissionsBarDatum { label: string; value: number; color: string }`, `EmissionsDonutDatum { name: string; value: number; color: string }`, `CityAqiDatum { name: string; aqi: number; color: string }` — consumed by chart components in Tasks 3-5.

- [ ] **Step 1: Write the failing tests**

Create `src/tests/chart-data.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
	cityAqiChartData,
	emissionsBarData,
	emissionsDonutData,
} from "../lib/chart-data";
import type { CityScore, EmissionsEntry } from "../lib/api-types";

const entry: EmissionsEntry = {
	country: "USA",
	rank: 2,
	emissions: {
		co2: 53795686037.8,
		ch4: 364677854.8,
		n2o: 7018608.5,
		co2e_100yr: 68453343280.4,
		co2e_20yr: 89585216627.9,
	},
	worldEmissions: {
		co2: 0,
		ch4: 0,
		n2o: 0,
		co2e_100yr: 568703620064.7,
		co2e_20yr: 0,
	},
};

describe("emissionsBarData", () => {
	it("returns the country and rest-of-world as two fixed-order slots", () => {
		const data = emissionsBarData(entry, "United States");
		expect(data).toEqual([
			{ label: "United States", value: 68453343280.4, color: "#1c9920" },
			{
				label: "Rest of world",
				value: 568703620064.7 - 68453343280.4,
				color: "#3d76d1",
			},
		]);
	});

	it("clamps a negative rest-of-world to 0 instead of going negative", () => {
		const weird: EmissionsEntry = {
			...entry,
			emissions: { ...entry.emissions, co2e_100yr: 999999999999 },
			worldEmissions: { ...entry.worldEmissions, co2e_100yr: 1 },
		};
		const data = emissionsBarData(weird, "X");
		expect(data[1].value).toBe(0);
	});
});

describe("emissionsDonutData", () => {
	it("returns CO2/CH4/N2O in fixed order with fixed colors", () => {
		expect(emissionsDonutData(entry)).toEqual([
			{ name: "CO2", value: 53795686037.8, color: "#1c9920" },
			{ name: "CH4", value: 364677854.8, color: "#3d76d1" },
			{ name: "N2O", value: 7018608.5, color: "#c2790c" },
		]);
	});
});

describe("cityAqiChartData", () => {
	it("maps each city score to a chart datum colored by aqiColor", () => {
		const scores: CityScore[] = [
			{
				cityId: 1,
				slug: "portland",
				name: "Portland",
				country: "USA",
				aqi: 16,
				fetchedAt: "2026-07-11T00:00:00Z",
			},
			{
				cityId: 2,
				slug: "la",
				name: "Los Angeles",
				country: "USA",
				aqi: 90,
				fetchedAt: "2026-07-11T00:00:00Z",
			},
		];
		const data = cityAqiChartData(scores);
		expect(data).toEqual([
			{ name: "Portland", aqi: 16, color: "#42c14c" },
			{ name: "Los Angeles", aqi: 90, color: "#f5b940" },
		]);
	});

	it("returns [] for an empty list", () => {
		expect(cityAqiChartData([])).toEqual([]);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `set -a; source .env; set +a; bun run test src/tests/chart-data.test.ts`
Expected: FAIL — `Cannot find module '../lib/chart-data'`

- [ ] **Step 3: Write the implementation**

Create `src/lib/chart-data.ts`:

```ts
import { aqiColor } from "./environment-format";
import type { CityScore, EmissionsEntry } from "./api-types";

export interface EmissionsBarDatum {
	label: string;
	value: number;
	color: string;
}

/** Fixed-order 2-slot categorical set: subject country then rest of world. */
export function emissionsBarData(
	entry: EmissionsEntry,
	countryLabel: string,
): EmissionsBarDatum[] {
	const rest = Math.max(
		0,
		entry.worldEmissions.co2e_100yr - entry.emissions.co2e_100yr,
	);
	return [
		{ label: countryLabel, value: entry.emissions.co2e_100yr, color: "#1c9920" },
		{ label: "Rest of world", value: rest, color: "#3d76d1" },
	];
}

export interface EmissionsDonutDatum {
	name: string;
	value: number;
	color: string;
}

/** Fixed-order 3-slot categorical set: CO2, CH4, N2O. */
export function emissionsDonutData(entry: EmissionsEntry): EmissionsDonutDatum[] {
	return [
		{ name: "CO2", value: entry.emissions.co2, color: "#1c9920" },
		{ name: "CH4", value: entry.emissions.ch4, color: "#3d76d1" },
		{ name: "N2O", value: entry.emissions.n2o, color: "#c2790c" },
	];
}

export interface CityAqiDatum {
	name: string;
	aqi: number;
	color: string;
}

/** Color is by magnitude (aqiColor gradient), not category identity. */
export function cityAqiChartData(scores: CityScore[]): CityAqiDatum[] {
	return scores.map((s) => ({
		name: s.name,
		aqi: s.aqi,
		color: aqiColor(s.aqi),
	}));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `set -a; source .env; set +a; bun run test src/tests/chart-data.test.ts`
Expected: PASS, 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/chart-data.ts src/tests/chart-data.test.ts
git commit -m "Add pure chart-data shaping functions for resources page charts"
```

---

### Task 3: Resources data file + loader

**Files:**
- Create: `src/data/resources.json`
- Create: `src/lib/resources.ts`
- Test: `src/tests/resources.test.ts`

**Interfaces:**
- Produces: `Resource` interface, `ResourceCategory`, `ResourceType` types, `resources: Resource[]`, `CATEGORIES: { id: ResourceCategory; label: string }[]`, `resourcesByCategory(category: ResourceCategory | "all"): Resource[]` — consumed by Task 6 (`resources.tsx`).

- [ ] **Step 1: Write the failing tests**

Create `src/tests/resources.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CATEGORIES, resources, resourcesByCategory } from "../lib/resources";

const VALID_CATEGORIES = new Set(CATEGORIES.map((c) => c.id));
const VALID_TYPES = new Set(["action", "article", "org", "data"]);

describe("resources data", () => {
	it("has at least 6 entries per category", () => {
		for (const cat of CATEGORIES) {
			const count = resources.filter((r) => r.category === cat.id).length;
			expect(count, `category ${cat.id} has ${count} entries`).toBeGreaterThanOrEqual(6);
		}
	});

	it("has unique ids", () => {
		const ids = resources.map((r) => r.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("only uses valid categories and types", () => {
		for (const r of resources) {
			expect(VALID_CATEGORIES.has(r.category)).toBe(true);
			expect(VALID_TYPES.has(r.type)).toBe(true);
		}
	});

	it("every entry has a non-empty title, description, and url", () => {
		for (const r of resources) {
			expect(r.title.length).toBeGreaterThan(0);
			expect(r.description.length).toBeGreaterThan(0);
			expect(r.url.startsWith("http") || r.url === "/map").toBe(true);
		}
	});

	it("only action-type entries may have an impact line", () => {
		for (const r of resources) {
			if (r.impact) expect(r.type).toBe("action");
		}
	});
});

describe("resourcesByCategory", () => {
	it("'all' returns every resource", () => {
		expect(resourcesByCategory("all")).toHaveLength(resources.length);
	});

	it("filters to just one category", () => {
		const carbon = resourcesByCategory("carbon");
		expect(carbon.length).toBeGreaterThan(0);
		expect(carbon.every((r) => r.category === "carbon")).toBe(true);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `set -a; source .env; set +a; bun run test src/tests/resources.test.ts`
Expected: FAIL — `Cannot find module '../lib/resources'`

- [ ] **Step 3: Write the data file**

Create `src/data/resources.json`:

```json
[
	{
		"id": "swap-car-trip",
		"category": "carbon",
		"type": "action",
		"title": "Swap one car trip a day",
		"impact": "~1 ton CO2/yr",
		"description": "Bike, walk, or take transit for your shortest daily trip. Short cold-engine drives are the least efficient ones.",
		"url": "https://www.epa.gov/greenvehicles/fast-facts-transportation-greenhouse-gas-emissions"
	},
	{
		"id": "global-carbon-project",
		"category": "carbon",
		"type": "org",
		"title": "Global Carbon Project",
		"description": "Tracks the annual global carbon budget and publishes the definitive yearly emissions numbers scientists cite.",
		"url": "https://www.globalcarbonproject.org/"
	},
	{
		"id": "owid-co2-emissions",
		"category": "carbon",
		"type": "data",
		"title": "CO2 and Greenhouse Gas Emissions — Our World in Data",
		"description": "Interactive charts on emissions by country, sector, and per capita, updated as new data lands.",
		"url": "https://ourworldindata.org/co2-and-greenhouse-gas-emissions"
	},
	{
		"id": "climate-trace",
		"category": "carbon",
		"type": "data",
		"title": "Climate TRACE",
		"description": "Satellite-verified emissions tracking down to individual facilities — the same source powering Ecoverse's country comparisons.",
		"url": "https://climatetrace.org"
	},
	{
		"id": "ipcc-ar6-synthesis",
		"category": "carbon",
		"type": "article",
		"title": "IPCC Sixth Assessment Synthesis Report",
		"description": "The UN's authoritative summary of the physical science, impacts, and pathways to limit warming.",
		"url": "https://www.ipcc.ch/report/ar6/syr/"
	},
	{
		"id": "epa-ghg-inventory",
		"category": "carbon",
		"type": "data",
		"title": "EPA Greenhouse Gas Inventory",
		"description": "The official annual US greenhouse gas emissions and sinks report, broken down by sector.",
		"url": "https://www.epa.gov/ghgemissions"
	},
	{
		"id": "project-drawdown",
		"category": "carbon",
		"type": "org",
		"title": "Project Drawdown",
		"description": "Ranks real-world climate solutions by how many gigatons of emissions each could actually avoid.",
		"url": "https://drawdown.org"
	},
	{
		"id": "carbon-brief",
		"category": "carbon",
		"type": "article",
		"title": "Carbon Brief",
		"description": "Plain-language explainers that translate new climate science and policy into what it actually means.",
		"url": "https://www.carbonbrief.org"
	},
	{
		"id": "community-solar",
		"category": "energy",
		"type": "action",
		"title": "Join community solar",
		"impact": "Up to 1.5 tons CO2/yr",
		"description": "No rooftop needed — subscribe to a shared solar farm and clean up your electricity in about 20 minutes.",
		"url": "https://www.energy.gov/communitysolar"
	},
	{
		"id": "heat-pump",
		"category": "energy",
		"type": "action",
		"title": "Switch to a heat pump",
		"impact": "2–4 tons CO2/yr",
		"description": "Heating is most homes' biggest energy use. Federal rebates can cover thousands of dollars of the cost.",
		"url": "https://www.energy.gov/energysaver/heat-pump-systems"
	},
	{
		"id": "iea",
		"category": "energy",
		"type": "org",
		"title": "International Energy Agency (IEA)",
		"description": "The world's most-cited source for energy data, forecasts, and clean-energy technology tracking.",
		"url": "https://www.iea.org"
	},
	{
		"id": "eia",
		"category": "energy",
		"type": "data",
		"title": "U.S. Energy Information Administration",
		"description": "Official US data on electricity generation, fuel mix, and prices by state, updated monthly.",
		"url": "https://www.eia.gov"
	},
	{
		"id": "nrel",
		"category": "energy",
		"type": "org",
		"title": "National Renewable Energy Laboratory",
		"description": "The US government's renewable energy research lab — solar, wind, and grid technology explainers.",
		"url": "https://www.nrel.gov"
	},
	{
		"id": "dsire",
		"category": "energy",
		"type": "data",
		"title": "DSIRE — Database of State Incentives for Renewables & Efficiency",
		"description": "Look up every solar, efficiency, and clean-energy rebate available in your state.",
		"url": "https://www.dsireusa.org"
	},
	{
		"id": "rmi",
		"category": "energy",
		"type": "org",
		"title": "RMI",
		"description": "Independent nonprofit driving the transition to clean energy through research and market analysis.",
		"url": "https://rmi.org"
	},
	{
		"id": "energy-star",
		"category": "energy",
		"type": "org",
		"title": "ENERGY STAR",
		"description": "The EPA's efficiency label — find the most efficient appliances and get rebate guidance for your home.",
		"url": "https://www.energystar.gov"
	},
	{
		"id": "coastal-cleanup-map",
		"category": "ocean",
		"type": "action",
		"title": "Join a coastal cleanup near you",
		"impact": "Removes plastic before it reaches the food chain",
		"description": "Beach and waterway cleanups near you are on the Ecoverse map, along with volunteer sign-up links.",
		"url": "/map"
	},
	{
		"id": "noaa-coral-reef-watch",
		"category": "ocean",
		"type": "data",
		"title": "NOAA Coral Reef Watch",
		"description": "Satellite-based heat-stress monitoring for reefs worldwide — the same feed behind Ecoverse's reef alerts.",
		"url": "https://coralreefwatch.noaa.gov"
	},
	{
		"id": "ocean-conservancy",
		"category": "ocean",
		"type": "org",
		"title": "Ocean Conservancy",
		"description": "Runs the International Coastal Cleanup and advocates for ocean policy backed by real data.",
		"url": "https://oceanconservancy.org"
	},
	{
		"id": "obis",
		"category": "ocean",
		"type": "data",
		"title": "Ocean Biodiversity Information System (OBIS)",
		"description": "The global open database of marine species sightings — powers Ecoverse's marine-life layer.",
		"url": "https://obis.org"
	},
	{
		"id": "surfrider",
		"category": "ocean",
		"type": "org",
		"title": "Surfrider Foundation",
		"description": "Grassroots coastal and ocean protection with local chapters running cleanups worldwide.",
		"url": "https://www.surfrider.org"
	},
	{
		"id": "noaa-marine-debris",
		"category": "ocean",
		"type": "article",
		"title": "NOAA Marine Debris Program",
		"description": "Research and reporting on where ocean plastic comes from and what's being done about it.",
		"url": "https://marinedebris.noaa.gov"
	},
	{
		"id": "ocean-cleanup",
		"category": "ocean",
		"type": "org",
		"title": "The Ocean Cleanup",
		"description": "Engineering nonprofit building systems to remove plastic from rivers and the open ocean.",
		"url": "https://theoceancleanup.com"
	},
	{
		"id": "repair-dont-replace",
		"category": "waste",
		"type": "action",
		"title": "Repair instead of replace",
		"impact": "Less landfill + embodied carbon",
		"description": "Most of a gadget's footprint happens before you ever turn it on. Repair cafés make fixing free and social.",
		"url": "https://www.repaircafe.org"
	},
	{
		"id": "epa-waste-facts",
		"category": "waste",
		"type": "data",
		"title": "EPA Facts and Figures about Materials, Waste and Recycling",
		"description": "The definitive US data on what we throw away, and how much actually gets recycled or composted.",
		"url": "https://www.epa.gov/facts-and-figures-about-materials-waste-and-recycling"
	},
	{
		"id": "ellen-macarthur",
		"category": "waste",
		"type": "org",
		"title": "Ellen MacArthur Foundation",
		"description": "Leading research and design guidance on the circular economy — designing waste out from the start.",
		"url": "https://www.ellenmacarthurfoundation.org"
	},
	{
		"id": "earth911",
		"category": "waste",
		"type": "org",
		"title": "Earth911 Recycling Search",
		"description": "Look up exactly where to recycle anything — batteries, electronics, plastics your curbside bin won't take.",
		"url": "https://earth911.com"
	},
	{
		"id": "zwia",
		"category": "waste",
		"type": "org",
		"title": "Zero Waste International Alliance",
		"description": "Sets the global standard definition and certification for zero-waste communities and businesses.",
		"url": "https://zwia.org"
	},
	{
		"id": "compost-food-scraps",
		"category": "waste",
		"type": "action",
		"title": "Compost your food scraps",
		"impact": "~0.3 ton CO2e/yr diverted from landfill methane",
		"description": "Food waste in landfills breaks down anaerobically into methane. Composting — even a countertop bin — avoids that.",
		"url": "https://www.epa.gov/recycle/composting-home"
	},
	{
		"id": "terracycle",
		"category": "waste",
		"type": "org",
		"title": "TerraCycle",
		"description": "Free and paid recycling programs for the hard-to-recycle stuff — snack wrappers, razors, cosmetics packaging.",
		"url": "https://www.terracycle.com"
	},
	{
		"id": "show-up-locally",
		"category": "biodiversity",
		"type": "action",
		"title": "Show up locally",
		"impact": "Multiplies everything",
		"description": "Cleanups, tree plantings, and co-op info nights near you are on the map. Bring a friend — action is contagious.",
		"url": "/map"
	},
	{
		"id": "iucn-red-list",
		"category": "biodiversity",
		"type": "data",
		"title": "IUCN Red List",
		"description": "The global authority on species extinction risk — see exactly how threatened a species is and why.",
		"url": "https://www.iucnredlist.org"
	},
	{
		"id": "wwf",
		"category": "biodiversity",
		"type": "org",
		"title": "World Wildlife Fund",
		"description": "The largest independent conservation organization, working on habitat protection worldwide.",
		"url": "https://www.worldwildlife.org"
	},
	{
		"id": "rainforest-alliance",
		"category": "biodiversity",
		"type": "org",
		"title": "Rainforest Alliance",
		"description": "Certifies farms and forests to sustainable standards — look for their seal on coffee, chocolate, and more.",
		"url": "https://www.rainforest-alliance.org"
	},
	{
		"id": "global-forest-watch",
		"category": "biodiversity",
		"type": "data",
		"title": "Global Forest Watch",
		"description": "Near-real-time satellite monitoring of forest loss anywhere on Earth, down to individual fires.",
		"url": "https://www.globalforestwatch.org"
	},
	{
		"id": "inaturalist",
		"category": "biodiversity",
		"type": "action",
		"title": "Log a sighting on iNaturalist",
		"impact": "Feeds real biodiversity research",
		"description": "Photograph any plant or animal and the community — plus AI — helps identify it. Your sightings become real research data.",
		"url": "https://www.inaturalist.org"
	},
	{
		"id": "nature-conservancy",
		"category": "biodiversity",
		"type": "org",
		"title": "The Nature Conservancy",
		"description": "Protects land and water through direct conservation purchases and restoration projects worldwide.",
		"url": "https://www.nature.org"
	},
	{
		"id": "plant-forward",
		"category": "food",
		"type": "action",
		"title": "Eat plant-forward twice a week",
		"impact": "~0.5 ton CO2/yr",
		"description": "Beef has roughly 10x the footprint of chicken and 30x that of beans. Two swapped dinners a week adds up fast.",
		"url": "https://ourworldindata.org/environmental-impacts-of-food"
	},
	{
		"id": "drawdown-food",
		"category": "food",
		"type": "article",
		"title": "Project Drawdown — Food, Agriculture & Land Use",
		"description": "Ranks the highest-impact food-system climate solutions, from diets to farming practices.",
		"url": "https://drawdown.org/sectors/food-agriculture-and-land-use"
	},
	{
		"id": "usda-food-loss",
		"category": "food",
		"type": "data",
		"title": "USDA Food Loss and Waste",
		"description": "US government data and initiatives on the roughly one-third of food that's lost or wasted.",
		"url": "https://www.usda.gov/foodlossandwaste"
	},
	{
		"id": "feeding-america",
		"category": "food",
		"type": "org",
		"title": "Feeding America",
		"description": "The largest US food-rescue network, turning surplus food into meals instead of landfill waste.",
		"url": "https://www.feedingamerica.org"
	},
	{
		"id": "seafood-watch",
		"category": "food",
		"type": "org",
		"title": "Monterey Bay Aquarium Seafood Watch",
		"description": "Real-time sustainable seafood ratings and a printable pocket guide for grocery runs and restaurants.",
		"url": "https://www.seafoodwatch.org"
	},
	{
		"id": "home-compost-garden",
		"category": "food",
		"type": "action",
		"title": "Start a small herb or vegetable garden",
		"impact": "Cuts packaging + transport emissions",
		"description": "Even a windowsill herb pot or a couple of raised beds offsets store-bought produce that traveled hundreds of miles.",
		"url": "https://www.almanac.com/vegetable-gardening-for-beginners"
	},
	{
		"id": "fao-food-ag-stats",
		"category": "food",
		"type": "data",
		"title": "FAO Food and Agriculture Data",
		"description": "The UN's global statistics on agriculture, land use, and food systems — the source behind most food-emissions research.",
		"url": "https://www.fao.org/food-agriculture-statistics/en/"
	},
	{
		"id": "airnow",
		"category": "air-quality",
		"type": "data",
		"title": "AirNow.gov",
		"description": "EPA's real-time US air quality map and alerts — check today's AQI before outdoor plans.",
		"url": "https://www.airnow.gov"
	},
	{
		"id": "epa-aqi-basics",
		"category": "air-quality",
		"type": "article",
		"title": "EPA — Air Quality Index Basics",
		"description": "Explains what AQI numbers mean, which pollutants are tracked, and who's most at risk on bad-air days.",
		"url": "https://www.epa.gov/aqi"
	},
	{
		"id": "who-air-quality",
		"category": "air-quality",
		"type": "article",
		"title": "WHO Air Quality Guidelines",
		"description": "The World Health Organization's global health-based limits for the major air pollutants.",
		"url": "https://www.who.int/teams/environment-climate-change-and-health/air-quality-and-health/health-impacts/types-of-pollutants"
	},
	{
		"id": "open-meteo-air-quality-api",
		"category": "air-quality",
		"type": "data",
		"title": "Open-Meteo Air Quality API",
		"description": "The free, keyless weather-and-air-quality data source Ecoverse itself runs on — open for anyone to build with.",
		"url": "https://open-meteo.com/en/docs/air-quality-api"
	},
	{
		"id": "check-aqi-before-outside",
		"category": "air-quality",
		"type": "action",
		"title": "Check today's AQI before outdoor plans",
		"impact": "Reduces personal exposure on high-pollution days",
		"description": "A quick check of the Ecoverse map tells you if it's a good day for a run or a day to keep windows closed.",
		"url": "/map"
	},
	{
		"id": "clean-air-task-force",
		"category": "air-quality",
		"type": "org",
		"title": "Clean Air Task Force",
		"description": "Policy-focused nonprofit working on the biggest levers to cut air pollution and methane at the source.",
		"url": "https://www.catf.us"
	},
	{
		"id": "lung-association-sota",
		"category": "air-quality",
		"type": "article",
		"title": "American Lung Association — State of the Air",
		"description": "Annual report grading air quality county-by-county across the US, with historical trends.",
		"url": "https://www.lung.org/research/sota"
	}
]
```

- [ ] **Step 4: Write the loader**

Create `src/lib/resources.ts`:

```ts
import rawResources from "../data/resources.json";

export type ResourceCategory =
	| "carbon"
	| "energy"
	| "ocean"
	| "waste"
	| "biodiversity"
	| "food"
	| "air-quality";

export type ResourceType = "action" | "article" | "org" | "data";

export interface Resource {
	id: string;
	category: ResourceCategory;
	type: ResourceType;
	title: string;
	description: string;
	url: string;
	impact?: string;
}

export const resources: Resource[] = rawResources as Resource[];

export const CATEGORIES: { id: ResourceCategory; label: string }[] = [
	{ id: "carbon", label: "Carbon & Emissions" },
	{ id: "energy", label: "Energy" },
	{ id: "ocean", label: "Ocean & Water" },
	{ id: "waste", label: "Waste & Recycling" },
	{ id: "biodiversity", label: "Biodiversity & Land" },
	{ id: "food", label: "Food" },
	{ id: "air-quality", label: "Air Quality" },
];

export function resourcesByCategory(
	category: ResourceCategory | "all",
): Resource[] {
	if (category === "all") return resources;
	return resources.filter((r) => r.category === category);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `set -a; source .env; set +a; bun run test src/tests/resources.test.ts`
Expected: PASS, 7 tests

- [ ] **Step 6: Commit**

```bash
git add src/data/resources.json src/lib/resources.ts src/tests/resources.test.ts
git commit -m "Add categorized resources data and loader (51 curated entries)"
```

---

### Task 4: Emissions bar + donut chart components

**Files:**
- Create: `src/components/charts/emissions-bar-chart.tsx`
- Create: `src/components/charts/emissions-donut.tsx`

**Interfaces:**
- Consumes: `emissionsBarData`, `emissionsDonutData` from `src/lib/chart-data.ts` (Task 2); `EmissionsEntry` from `src/lib/api-types.ts`; `formatTonnesCo2e` from `src/lib/format.ts` (already exists); `GlassCard`/`GlassCardHeader`/`GlassCardTitle`/`GlassCardDescription`/`GlassCardContent` from `src/components/ui/glass-card.tsx`.
- Produces: `EmissionsBarChart({ entry: EmissionsEntry; countryName: string })`, `EmissionsDonut({ entry: EmissionsEntry })` — consumed by Task 6.

No unit test for this task — these are thin presentational components over already-tested pure data functions (matches the repo's existing convention of testing `src/lib/*` and leaving `src/routes`/`src/components` untested; there is no component-testing setup in `vitest.config.ts`, which only picks up `src/tests/**/*.test.ts`). Verified visually in Task 6's manual smoke test instead.

- [ ] **Step 1: Write `emissions-bar-chart.tsx`**

```tsx
import {
	Bar,
	BarChart,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	GlassCard,
	GlassCardContent,
	GlassCardDescription,
	GlassCardHeader,
	GlassCardTitle,
} from "#/components/ui/glass-card";
import type { EmissionsEntry } from "#/lib/api-types";
import { emissionsBarData } from "#/lib/chart-data";
import { formatTonnesCo2e } from "#/lib/format";

const TOOLTIP_STYLE = {
	background: "rgba(15,23,42,0.95)",
	border: "1px solid rgba(255,255,255,0.15)",
	borderRadius: 12,
	color: "white",
};

export function EmissionsBarChart({
	entry,
	countryName,
}: {
	entry: EmissionsEntry;
	countryName: string;
}) {
	const data = emissionsBarData(entry, countryName);

	return (
		<GlassCard>
			<GlassCardHeader>
				<GlassCardTitle>{countryName} vs. the world</GlassCardTitle>
				<GlassCardDescription>
					Annual CO2-equivalent emissions (100-year basis)
				</GlassCardDescription>
			</GlassCardHeader>
			<GlassCardContent>
				<div className="h-40">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
							<XAxis type="number" hide />
							<YAxis
								type="category"
								dataKey="label"
								width={110}
								tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
								axisLine={false}
								tickLine={false}
							/>
							<Tooltip
								cursor={{ fill: "rgba(255,255,255,0.06)" }}
								contentStyle={TOOLTIP_STYLE}
								formatter={(value: number) => formatTonnesCo2e(value)}
							/>
							<Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
								{data.map((d) => (
									<Cell key={d.label} fill={d.color} />
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</GlassCardContent>
		</GlassCard>
	);
}
```

- [ ] **Step 2: Write `emissions-donut.tsx`**

```tsx
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
	GlassCard,
	GlassCardContent,
	GlassCardDescription,
	GlassCardHeader,
	GlassCardTitle,
} from "#/components/ui/glass-card";
import type { EmissionsEntry } from "#/lib/api-types";
import { emissionsDonutData } from "#/lib/chart-data";
import { formatTonnesCo2e } from "#/lib/format";

const TOOLTIP_STYLE = {
	background: "rgba(15,23,42,0.95)",
	border: "1px solid rgba(255,255,255,0.15)",
	borderRadius: 12,
	color: "white",
};

export function EmissionsDonut({ entry }: { entry: EmissionsEntry }) {
	const data = emissionsDonutData(entry);

	return (
		<GlassCard glowEffect={false}>
			<GlassCardHeader>
				<GlassCardTitle>Gas breakdown</GlassCardTitle>
				<GlassCardDescription>By CO2-equivalent mass</GlassCardDescription>
			</GlassCardHeader>
			<GlassCardContent className="flex flex-col items-center gap-4 sm:flex-row">
				<div className="h-40 w-40 shrink-0">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie
								data={data}
								dataKey="value"
								nameKey="name"
								innerRadius={50}
								outerRadius={78}
								paddingAngle={2}
								strokeWidth={0}
							>
								{data.map((d) => (
									<Cell key={d.name} fill={d.color} />
								))}
							</Pie>
							<Tooltip
								contentStyle={TOOLTIP_STYLE}
								formatter={(value: number) => formatTonnesCo2e(value)}
							/>
						</PieChart>
					</ResponsiveContainer>
				</div>
				<ul className="flex flex-1 flex-col gap-2 text-sm">
					{data.map((d) => (
						<li key={d.name} className="flex items-center justify-between gap-3">
							<span className="flex items-center gap-2 text-white/80">
								<span
									className="h-2.5 w-2.5 shrink-0 rounded-full"
									style={{ backgroundColor: d.color }}
								/>
								{d.name}
							</span>
							<span className="font-medium text-white">
								{formatTonnesCo2e(d.value)}
							</span>
						</li>
					))}
				</ul>
			</GlassCardContent>
		</GlassCard>
	);
}
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: no errors (these files aren't imported anywhere yet, but they must compile standalone)

- [ ] **Step 4: Commit**

```bash
git add src/components/charts/emissions-bar-chart.tsx src/components/charts/emissions-donut.tsx
git commit -m "Add emissions bar and donut chart components"
```

---

### Task 5: AQI-by-city chart component

**Files:**
- Create: `src/components/charts/aqi-by-city-chart.tsx`

**Interfaces:**
- Consumes: `cityAqiChartData` from `src/lib/chart-data.ts` (Task 2); `CityScore` from `src/lib/api-types.ts`.
- Produces: `AqiByCityChart({ scores: CityScore[] })` — consumed by Task 6.

- [ ] **Step 1: Write the component**

```tsx
import {
	Bar,
	BarChart,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	GlassCard,
	GlassCardContent,
	GlassCardDescription,
	GlassCardHeader,
	GlassCardTitle,
} from "#/components/ui/glass-card";
import type { CityScore } from "#/lib/api-types";
import { cityAqiChartData } from "#/lib/chart-data";

const TOOLTIP_STYLE = {
	background: "rgba(15,23,42,0.95)",
	border: "1px solid rgba(255,255,255,0.15)",
	borderRadius: 12,
	color: "white",
};

export function AqiByCityChart({ scores }: { scores: CityScore[] }) {
	const data = cityAqiChartData(scores);

	return (
		<GlassCard glowEffect={false}>
			<GlassCardHeader>
				<GlassCardTitle>Live air quality by city</GlassCardTitle>
				<GlassCardDescription>
					US AQI at each Ecoverse city's center — lower is cleaner
				</GlassCardDescription>
			</GlassCardHeader>
			<GlassCardContent>
				<div style={{ height: Math.max(240, data.length * 28) }}>
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
							<XAxis type="number" hide />
							<YAxis
								type="category"
								dataKey="name"
								width={110}
								tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
								axisLine={false}
								tickLine={false}
							/>
							<Tooltip
								cursor={{ fill: "rgba(255,255,255,0.06)" }}
								contentStyle={TOOLTIP_STYLE}
								formatter={(value: number) => [`${value} US AQI`, ""]}
							/>
							<Bar dataKey="aqi" radius={[0, 4, 4, 0]} barSize={16}>
								{data.map((d) => (
									<Cell key={d.name} fill={d.color} />
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</GlassCardContent>
		</GlassCard>
	);
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/charts/aqi-by-city-chart.tsx
git commit -m "Add AQI-by-city chart component"
```

---

### Task 6: Rewrite the Resources page

**Files:**
- Modify: `src/routes/resources.tsx` (full-file replace — every section changes)

**Interfaces:**
- Consumes: `CATEGORIES`, `Resource`, `ResourceCategory`, `ResourceType`, `resourcesByCategory` from `src/lib/resources.ts` (Task 3); `EmissionsBarChart` (Task 4); `EmissionsDonut` (Task 4); `AqiByCityChart` (Task 5); `useCityScores` from `src/hooks/use-cities.ts` (already exists); `EMISSIONS_COUNTRIES`, `flagEmoji` from `src/lib/country.ts` (already exists, unchanged); `GlassBadge` from `src/components/ui/glass-badge.tsx`.
- Produces: the `/resources` route — nothing downstream depends on this file's internals.

- [ ] **Step 1: Replace the full file**

Replace the entire contents of `src/routes/resources.tsx` with:

```tsx
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	BarChart3,
	ExternalLink,
	Flame,
	Recycle,
	Trees,
	Utensils,
	Waves,
	Wind,
	Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { AqiByCityChart } from "#/components/charts/aqi-by-city-chart";
import { EmissionsBarChart } from "#/components/charts/emissions-bar-chart";
import { EmissionsDonut } from "#/components/charts/emissions-donut";
import { GlassBadge } from "#/components/ui/glass-badge";
import {
	GlassCard,
	GlassCardContent,
	GlassCardHeader,
	GlassCardTitle,
} from "#/components/ui/glass-card";
import { useCityScores } from "#/hooks/use-cities";
import { fetchJson } from "#/lib/api-client";
import type { EmissionsResponse } from "#/lib/api-types";
import { EMISSIONS_COUNTRIES, flagEmoji } from "#/lib/country";
import {
	CATEGORIES,
	type Resource,
	type ResourceCategory,
	type ResourceType,
	resourcesByCategory,
} from "#/lib/resources";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/resources")({
	component: ResourcesPage,
});

const CATEGORY_ICON: Record<ResourceCategory, typeof Flame> = {
	carbon: Flame,
	energy: Zap,
	ocean: Waves,
	waste: Recycle,
	biodiversity: Trees,
	food: Utensils,
	"air-quality": Wind,
};

const TYPE_BADGE: Record<
	ResourceType,
	"success" | "primary" | "default" | "outline"
> = {
	action: "success",
	article: "primary",
	org: "default",
	data: "outline",
};

const TYPE_LABEL: Record<ResourceType, string> = {
	action: "Action",
	article: "Article",
	org: "Org",
	data: "Data",
};

function ResourcesPage() {
	const [category, setCategory] = useState<ResourceCategory | "all">("all");
	const visible = resourcesByCategory(category);

	return (
		<div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
			<h1 className="text-3xl font-bold">Be part of the solution</h1>
			<p className="mt-2 max-w-2xl text-muted-foreground">
				Actions you can take today, plus real orgs, data, and reading to
				understand the why. Browse by category, or find an event near you on
				the map.
			</p>

			<div className="mt-6 flex flex-wrap gap-2">
				<CategoryPill active={category === "all"} onClick={() => setCategory("all")}>
					All
				</CategoryPill>
				{CATEGORIES.map((c) => {
					const Icon = CATEGORY_ICON[c.id];
					return (
						<CategoryPill
							key={c.id}
							active={category === c.id}
							onClick={() => setCategory(c.id)}
						>
							<Icon className="h-3.5 w-3.5" /> {c.label}
						</CategoryPill>
					);
				})}
			</div>

			<div className="mt-8 grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{visible.map((resource) => (
					<ResourceCard key={resource.id} resource={resource} />
				))}
			</div>

			<div className="mt-10">
				<Link
					to="/map"
					className="inline-flex items-center gap-2 font-medium text-forest-400 hover:underline"
				>
					Find an event near you <ArrowRight className="h-4 w-4" />
				</Link>
			</div>

			<EmissionsSection />
		</div>
	);
}

function CategoryPill({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition",
				active
					? "border-forest-400/40 bg-forest-500/25 text-forest-100"
					: "border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80",
			)}
		>
			{children}
		</button>
	);
}

function ResourceCard({ resource }: { resource: Resource }) {
	return (
		<GlassCard glowEffect={false} className="flex h-full flex-col">
			<GlassCardHeader>
				<GlassBadge variant={TYPE_BADGE[resource.type]} className="w-fit">
					{TYPE_LABEL[resource.type]}
				</GlassBadge>
				<GlassCardTitle className="mt-2">{resource.title}</GlassCardTitle>
				{resource.impact && (
					<span className="text-forest-400 text-xs">{resource.impact}</span>
				)}
			</GlassCardHeader>
			<GlassCardContent className="flex flex-1 flex-col">
				<p className="flex-1 text-sm text-white/60">{resource.description}</p>
				{resource.url === "/map" ? (
					<Link
						to="/map"
						className="mt-3 flex items-center gap-1 text-forest-400 text-xs hover:underline"
					>
						Find one near you <ArrowRight className="h-3 w-3" />
					</Link>
				) : (
					<a
						href={resource.url}
						target="_blank"
						rel="noreferrer"
						className="mt-3 flex items-center gap-1 text-forest-400 text-xs hover:underline"
					>
						Learn more <ExternalLink className="h-3 w-3" />
					</a>
				)}
			</GlassCardContent>
		</GlassCard>
	);
}

function EmissionsSection() {
	const [country, setCountry] = useState("USA");
	const selected = EMISSIONS_COUNTRIES.find((c) => c.iso3 === country);

	const { data, isLoading, error } = useQuery({
		queryKey: ["emissions", country],
		queryFn: () =>
			fetchJson<EmissionsResponse>(`/api/emissions?country=${country}`),
	});
	const cityScores = useCityScores();

	const entry = data?.data?.[0];

	return (
		<div className="mt-20">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-2">
					<BarChart3 className="h-6 w-6 text-forest-400" />
					<h2 className="text-2xl font-bold">Global Emissions</h2>
				</div>
				<select
					value={country}
					onChange={(e) => setCountry(e.target.value)}
					className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-foreground shadow-lg backdrop-blur-xl outline-none transition hover:bg-white/15"
				>
					{EMISSIONS_COUNTRIES.map((c) => (
						<option key={c.iso3} value={c.iso3} className="bg-slate-900">
							{flagEmoji(c.iso2)} {c.name}
						</option>
					))}
				</select>
			</div>
			<p className="mt-2 max-w-2xl text-muted-foreground">
				Country-level carbon data from Climate TRACE — compare any country's
				share of the world's warming against the rest of Earth.
			</p>

			{isLoading && (
				<p className="mt-8 text-muted-foreground">Loading emissions data…</p>
			)}
			{error && (
				<p className="mt-8 text-red-400">
					Couldn't load emissions data. Try again shortly.
				</p>
			)}

			{entry && selected && (
				<div className="mt-8 grid gap-6 lg:grid-cols-2">
					<EmissionsBarChart entry={entry} countryName={selected.name} />
					<EmissionsDonut entry={entry} />
				</div>
			)}

			{entry && (
				<p className="mt-4 text-sm text-white/50">
					{(selected?.name ?? country)} is responsible for about{" "}
					{(
						(entry.emissions.co2e_100yr / entry.worldEmissions.co2e_100yr) *
						100
					).toFixed(1)}
					% of tracked global CO2e emissions — ranked #{entry.rank}.{" "}
					<a
						href="https://climatetrace.org"
						target="_blank"
						rel="noreferrer"
						className="text-forest-400 hover:underline"
					>
						Source: Climate TRACE
					</a>
				</p>
			)}

			<div className="mt-8">
				{cityScores.isLoading && (
					<p className="text-muted-foreground">Loading live air quality…</p>
				)}
				{cityScores.error && (
					<p className="text-red-400">
						Couldn't load live environmental scores right now.
					</p>
				)}
				{cityScores.data && <AqiByCityChart scores={cityScores.data.scores} />}
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Run the full quality gates**

Run: `bun run lint:fix`
Expected: no unfixable errors

Run: `bun run typecheck`
Expected: no errors

Run: `set -a; source .env; set +a; bun run test`
Expected: all tests pass, including the new `chart-data.test.ts` and `resources.test.ts`

Run: `bun run build`
Expected: build succeeds

- [ ] **Step 3: Manual smoke test**

Run: `bun run dev`, then in a browser visit `http://localhost:3000/resources` (or `:3001` if 3000 is busy) and verify:
- Category pills filter the grid (click "Energy" → only energy cards show; click "All" → all ~51 show)
- Each card shows a type badge, title, description, and a working link (external opens in a new tab; the two `/map`-linked action cards navigate within the app)
- Scrolling to Global Emissions: country selector still works, the bar chart and donut render with real data and hover tooltips
- Below that, the AQI-by-city bar chart renders ~26 bars colored green→yellow→red, sorted cleanest-first

- [ ] **Step 4: Commit**

```bash
git add src/routes/resources.tsx
git commit -m "Rewrite Resources page: categorized library + real charts"
```

---

### Task 7: Open the PR

**Files:** none (process step)

- [ ] **Step 1: Push the branch**

Run: `git push -u origin resources-library`

- [ ] **Step 2: Open the PR**

Run:
```bash
gh pr create --base main --title "Categorized resources library + real charts" --body "$(cat <<'EOF'
## Summary
- Resources page rewritten: 51 curated resources (actions, articles, orgs, data sources) across 7 filterable categories (Carbon & Emissions, Energy, Ocean & Water, Waste & Recycling, Biodiversity & Land, Food, Air Quality), replacing the old 6 hardcoded action cards.
- All metric displays upgraded from hand-rolled divs to real Recharts charts: emissions bar chart (country vs world), emissions donut (CO2/CH4/N2O), and a new AQI-by-city bar chart (26 cities, reuses the existing `/api/cities/scores` endpoint — zero new backend work).
- Chart colors follow the dataviz skill's categorical method — validated via `validate_palette.js` (lightness band, chroma floor, CVD separation, contrast all pass in dark mode).
- Chart data-shaping is pure and unit-tested (`src/lib/chart-data.ts`); resource data loading is pure and unit-tested (`src/lib/resources.ts`).

## Test plan
- [x] lint / typecheck / test / build all green
- [ ] Manual smoke test: category filters, card links, both emissions charts, AQI-by-city chart

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Report the PR URL to the user**
