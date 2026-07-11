import type { db as Db } from "../db";
import { cities, cityEnvironmentScores } from "../db/schema";
import { fetchUpstream } from "./api-utils";

const TTL_MS = 24 * 60 * 60 * 1000; // refresh once/day

export interface CityScore {
	cityId: number;
	slug: string;
	name: string;
	country: string;
	aqi: number;
	fetchedAt: string;
}

interface AirQualityResponse {
	current?: { us_aqi?: number };
}

async function fetchAqi(lat: number, lng: number): Promise<number | null> {
	const upstream = new URL(
		"https://air-quality-api.open-meteo.com/v1/air-quality",
	);
	upstream.searchParams.set("latitude", String(lat));
	upstream.searchParams.set("longitude", String(lng));
	upstream.searchParams.set("current", "us_aqi");

	const result = await fetchUpstream(upstream, { name: "Open-Meteo" });
	if (!result.ok) return null;
	const aqi = (result.data as AirQualityResponse).current?.us_aqi;
	return typeof aqi === "number" ? aqi : null;
}

/** Live AQI per city, DB-cached for 24h. Cleanest air (lowest AQI) first. */
export async function getCityScores(db: typeof Db): Promise<CityScore[]> {
	const allCities = await db.select().from(cities);

	const withCoords = allCities.filter(
		(c): c is typeof c & { lat: number; lng: number } =>
			c.lat != null && c.lng != null,
	);

	const cached = await db.select().from(cityEnvironmentScores);
	const cacheByCityId = new Map(cached.map((row) => [row.cityId, row]));

	const scores = await Promise.all(
		withCoords.map(async (city) => {
			const cachedRow = cacheByCityId.get(city.id);
			const fresh =
				cachedRow && Date.now() - cachedRow.fetchedAt.getTime() < TTL_MS;

			if (fresh) {
				return {
					cityId: city.id,
					slug: city.slug,
					name: city.name,
					country: city.country,
					aqi: cachedRow.aqi,
					fetchedAt: cachedRow.fetchedAt.toISOString(),
				} satisfies CityScore;
			}

			const aqi = await fetchAqi(city.lat, city.lng);
			const resolvedAqi = aqi ?? cachedRow?.aqi;
			if (resolvedAqi == null) return null;

			const fetchedAt = new Date();
			await db
				.insert(cityEnvironmentScores)
				.values({ cityId: city.id, aqi: resolvedAqi, fetchedAt })
				.onConflictDoUpdate({
					target: cityEnvironmentScores.cityId,
					set: { aqi: resolvedAqi, fetchedAt },
				});

			return {
				cityId: city.id,
				slug: city.slug,
				name: city.name,
				country: city.country,
				aqi: resolvedAqi,
				fetchedAt: fetchedAt.toISOString(),
			} satisfies CityScore;
		}),
	);

	return scores
		.filter((s): s is CityScore => s !== null)
		.sort((a, b) => a.aqi - b.aqi);
}
