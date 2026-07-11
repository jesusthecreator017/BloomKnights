import rawBaked from "../data/baked-events.json";
import rawEvents from "../data/events.json";
import { geoCacheKey, TTL } from "./api-utils";
import { cached } from "./cache";

export interface EcoEvent {
	id: string;
	name: string;
	description: string;
	category: string;
	date: string;
	lat: number;
	lng: number;
	city: string;
	url: string;
	volunteerUrl?: string;
}

/** Curated fallback list — served whenever the live lookup can't. */
export const events: Array<EcoEvent> = rawEvents;

/** Pure — validates untrusted (Gemini) output into EcoEvents, dropping bad rows. */
export function validateEcoEvents(json: unknown): EcoEvent[] {
	if (!Array.isArray(json)) return [];
	const out: EcoEvent[] = [];
	for (const item of json) {
		if (typeof item !== "object" || item === null) continue;
		const e = item as Record<string, unknown>;
		if (
			typeof e.id !== "string" ||
			typeof e.name !== "string" ||
			typeof e.description !== "string" ||
			typeof e.category !== "string" ||
			typeof e.date !== "string" ||
			!/^\d{4}-\d{2}-\d{2}$/.test(e.date) ||
			typeof e.lat !== "number" ||
			typeof e.lng !== "number" ||
			e.lat < -90 ||
			e.lat > 90 ||
			e.lng < -180 ||
			e.lng > 180 ||
			typeof e.city !== "string" ||
			typeof e.url !== "string" ||
			!/^https?:\/\//.test(e.url)
		) {
			continue;
		}
		out.push({
			id: e.id,
			name: e.name,
			description: e.description,
			category: e.category,
			date: e.date,
			lat: e.lat,
			lng: e.lng,
			city: e.city,
			url: e.url,
			...(typeof e.volunteerUrl === "string" &&
			/^https?:\/\//.test(e.volunteerUrl)
				? { volunteerUrl: e.volunteerUrl }
				: {}),
		});
	}
	return out;
}

export interface BakedCityEvents {
	name: string;
	lat: number;
	lng: number;
	events: EcoEvent[];
}

/** Pre-searched demo events per US major city, produced by `bun run bake:events`. */
export const bakedEvents = rawBaked as unknown as Record<
	string,
	BakedCityEvents
>;

function distanceKm(
	aLat: number,
	aLng: number,
	bLat: number,
	bLng: number,
): number {
	const rad = Math.PI / 180;
	const dLat = (bLat - aLat) * rad;
	const dLng = (bLng - aLng) * rad;
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
	return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Pure — nearest baked city's events within maxKm, else null. Exported for tests. */
export function nearestBakedEvents(
	data: Record<string, BakedCityEvents>,
	lat: number,
	lng: number,
	maxKm = 150,
): EcoEvent[] | null {
	let best: BakedCityEvents | null = null;
	let bestDist = maxKm;
	for (const city of Object.values(data)) {
		const d = distanceKm(lat, lng, city.lat, city.lng);
		if (d <= bestDist && city.events.length > 0) {
			best = city;
			bestDist = d;
		}
	}
	return best?.events ?? null;
}

/**
 * Live events near a point (Gemini + Search grounding, cached 24h per ~1km
 * cell). On any failure — no key, depleted credits, junk output — falls back
 * to the nearest baked city's pre-searched events, then to the curated list,
 * so the map never goes empty. Dynamic import keeps the events→gemini edge
 * lazy since gemini.ts statically imports this module.
 */
export async function getEvents(lat: number, lng: number): Promise<EcoEvent[]> {
	const { findLiveEvents } = await import("./gemini");
	return cached(geoCacheKey("events:live", lat, lng), TTL.rare, () =>
		findLiveEvents(lat, lng),
	).catch(() => nearestBakedEvents(bakedEvents, lat, lng) ?? events);
}
