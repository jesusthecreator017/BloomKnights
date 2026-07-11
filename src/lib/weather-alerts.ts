export interface WeatherAlert {
	id: string;
	event: string;
	headline: string;
	severity: string;
	areaDesc: string;
	lat: number;
	lng: number;
	effective: string;
	expires: string;
	description: string;
	link: string;
}

interface NwsGeometry {
	type: "Polygon" | "MultiPolygon";
	coordinates: number[][][] | number[][][][];
}

interface NwsFeature {
	id: string;
	properties: {
		event?: string;
		headline?: string;
		severity?: string;
		areaDesc?: string;
		effective?: string;
		expires?: string;
		description?: string;
	};
	geometry: NwsGeometry | null;
}

interface NwsAlertsResponse {
	features?: NwsFeature[];
}

/** Rough centroid of a Polygon/MultiPolygon's exterior points — good enough for a map pin. */
function centroid(geometry: NwsGeometry): { lat: number; lng: number } | null {
	const rings: number[][][] =
		geometry.type === "Polygon"
			? (geometry.coordinates as number[][][])
			: (geometry.coordinates as number[][][][]).flat();

	const points = rings.flat();
	if (points.length === 0) return null;

	let sumLat = 0;
	let sumLng = 0;
	for (const [lng, lat] of points) {
		sumLng += lng;
		sumLat += lat;
	}
	return { lat: sumLat / points.length, lng: sumLng / points.length };
}

export function parseWeatherAlerts(body: NwsAlertsResponse): WeatherAlert[] {
	const alerts: WeatherAlert[] = [];
	for (const feature of body.features ?? []) {
		if (!feature.geometry) continue;
		const point = centroid(feature.geometry);
		if (!point) continue;

		const p = feature.properties;
		alerts.push({
			id: feature.id,
			event: p.event ?? "Weather Alert",
			headline: p.headline ?? p.event ?? "Active weather alert",
			severity: p.severity ?? "Unknown",
			areaDesc: p.areaDesc ?? "",
			lat: point.lat,
			lng: point.lng,
			effective: p.effective ?? "",
			expires: p.expires ?? "",
			description: p.description ?? "",
			link: "https://www.weather.gov/alerts/fl.html",
		});
	}
	return alerts;
}
