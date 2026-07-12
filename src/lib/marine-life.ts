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
