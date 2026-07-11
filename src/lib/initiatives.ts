import rawInitiatives from "../data/initiatives.json";
import { geoCacheKey, TTL } from "./api-utils";
import { cached } from "./cache";

export interface EcoInitiative {
	id: string;
	name: string;
	description: string;
	category: string;
	lat: number;
	lng: number;
	city: string;
	website: string;
	volunteerUrl?: string;
}

/** Curated fallback list — served whenever the live lookup can't. */
export const initiatives: Array<EcoInitiative> = rawInitiatives;

interface PlacesSearchResult {
	places?: Array<{
		id?: string;
		displayName?: { text?: string };
		formattedAddress?: string;
		location?: { latitude?: number; longitude?: number };
		websiteUri?: string;
		types?: string[];
	}>;
}

/** Pure — maps a Places searchText body to EcoInitiatives. Exported for tests. */
export function mapPlacesToInitiatives(body: unknown): EcoInitiative[] {
	const places = (body as PlacesSearchResult)?.places;
	if (!Array.isArray(places)) return [];
	const out: EcoInitiative[] = [];
	for (const p of places) {
		if (
			typeof p.id !== "string" ||
			typeof p.displayName?.text !== "string" ||
			typeof p.location?.latitude !== "number" ||
			typeof p.location?.longitude !== "number"
		) {
			continue;
		}
		const address = p.formattedAddress ?? "";
		out.push({
			id: p.id,
			name: p.displayName.text,
			description: address,
			category: p.types?.includes("non_profit_organization")
				? "nonprofit"
				: "organization",
			lat: p.location.latitude,
			lng: p.location.longitude,
			// second-to-last address segment is usually "City, ST"
			city: address.split(",").slice(-3, -2)[0]?.trim() ?? "",
			website: p.websiteUri ?? "",
		});
	}
	return out;
}

/**
 * Real environmental orgs near a point via Google Places Text Search,
 * cached 24h per ~1km cell. Falls back to the curated list on missing key or
 * any API failure.
 */
export async function getInitiatives(
	lat: number,
	lng: number,
): Promise<EcoInitiative[]> {
	const key = process.env.GOOGLE_PLACES_API_KEY;
	if (!key) return initiatives;

	return cached(
		geoCacheKey("initiatives:live", lat, lng),
		TTL.rare,
		async () => {
			const res = await fetch(
				"https://places.googleapis.com/v1/places:searchText",
				{
					method: "POST",
					signal: AbortSignal.timeout(10_000),
					headers: {
						"content-type": "application/json",
						"X-Goog-Api-Key": key,
						"X-Goog-FieldMask":
							"places.id,places.displayName,places.formattedAddress,places.location,places.websiteUri,places.types",
					},
					body: JSON.stringify({
						textQuery: "environmental organization volunteer conservation",
						locationBias: {
							circle: {
								center: { latitude: lat, longitude: lng },
								radius: 30000,
							},
						},
						maxResultCount: 15,
					}),
				},
			);
			if (!res.ok) throw new Error(`Places searchText responded ${res.status}`);
			const mapped = mapPlacesToInitiatives(await res.json());
			if (mapped.length === 0)
				throw new Error("Places returned no usable orgs");
			return mapped;
		},
	).catch(() => initiatives);
}
