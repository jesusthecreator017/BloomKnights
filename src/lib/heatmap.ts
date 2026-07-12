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
