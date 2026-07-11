/**
 * Pre-search upcoming eco events for US major cities via Gemini + Google
 * Search grounding and bake them into src/data/baked-events.json, which
 * /api/events serves as a fallback when a live search fails.
 *
 *   bun run bake:events            # all cities
 *   bun run bake:events nyc miami  # just these slugs
 *
 * Requires GEMINI_API_KEY. Cities that fail keep their previous baked data.
 */
import { readFileSync, writeFileSync } from "node:fs";
import type { BakedCityEvents } from "../src/lib/events";
import { findLiveEvents } from "../src/lib/gemini";

const OUT = "src/data/baked-events.json";

// the 14 US cities from the seeded leaderboard roster
const CITIES: Array<{ slug: string; name: string; lat: number; lng: number }> =
	[
		{ slug: "nyc", name: "New York City", lat: 40.7128, lng: -74.006 },
		{ slug: "los-angeles", name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
		{ slug: "chicago", name: "Chicago", lat: 41.8781, lng: -87.6298 },
		{ slug: "orlando", name: "Orlando", lat: 28.5383, lng: -81.3792 },
		{
			slug: "san-francisco",
			name: "San Francisco",
			lat: 37.7749,
			lng: -122.4194,
		},
		{ slug: "seattle", name: "Seattle", lat: 47.6062, lng: -122.3321 },
		{ slug: "austin", name: "Austin", lat: 30.2672, lng: -97.7431 },
		{ slug: "denver", name: "Denver", lat: 39.7392, lng: -104.9903 },
		{ slug: "miami", name: "Miami", lat: 25.7617, lng: -80.1918 },
		{ slug: "boston", name: "Boston", lat: 42.3601, lng: -71.0589 },
		{ slug: "houston", name: "Houston", lat: 29.7604, lng: -95.3698 },
		{ slug: "atlanta", name: "Atlanta", lat: 33.749, lng: -84.388 },
		{ slug: "portland", name: "Portland", lat: 45.5152, lng: -122.6784 },
		{
			slug: "washington-dc",
			name: "Washington D.C.",
			lat: 38.9072,
			lng: -77.0369,
		},
	];

const only = process.argv.slice(2);
const targets = only.length
	? CITIES.filter((c) => only.includes(c.slug))
	: CITIES;

const baked: Record<string, BakedCityEvents> = JSON.parse(
	readFileSync(OUT, "utf8"),
);

let ok = 0;
let failed = 0;
for (const city of targets) {
	try {
		const events = await findLiveEvents(city.lat, city.lng);
		baked[city.slug] = { name: city.name, lat: city.lat, lng: city.lng, events };
		ok++;
		console.log(`baked ${city.slug}: ${events.length} events`);
	} catch (err) {
		failed++;
		console.error(
			`FAILED ${city.slug}: ${err instanceof Error ? err.message : err}`,
		);
	}
}

writeFileSync(OUT, `${JSON.stringify(baked, null, "\t")}\n`);
console.log(`\nwrote ${OUT}: ${ok} baked, ${failed} failed`);
process.exit(failed > 0 && ok === 0 ? 1 : 0);
