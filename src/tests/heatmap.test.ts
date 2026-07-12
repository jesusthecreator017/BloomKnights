import { describe, expect, it } from "vitest";
import { buildGrid, zipHeatmapPoints } from "../lib/heatmap";

describe("buildGrid", () => {
	it("returns 64 points (8x8) centered on the input", () => {
		const grid = buildGrid(40, -74);
		expect(grid).toHaveLength(64);
	});

	it("spans roughly +/- 0.5 degrees around the center", () => {
		const grid = buildGrid(40, -74);
		const lats = grid.map((p) => p.lat);
		const lngs = grid.map((p) => p.lng);
		expect(Math.min(...lats)).toBeCloseTo(39.5, 5);
		expect(Math.max(...lats)).toBeCloseTo(40.5, 5);
		expect(Math.min(...lngs)).toBeCloseTo(-74.5, 5);
		expect(Math.max(...lngs)).toBeCloseTo(-73.5, 5);
	});
});

describe("zipHeatmapPoints", () => {
	const grid = [
		{ lat: 40, lng: -74 },
		{ lat: 40.1, lng: -74.1 },
		{ lat: 40.2, lng: -74.2 },
	];

	it("pairs each grid point with its current[field] value", () => {
		const raw = [
			{ current: { us_aqi: 42 } },
			{ current: { us_aqi: 88 } },
			{ current: { us_aqi: 15 } },
		];
		expect(zipHeatmapPoints(grid, raw, "us_aqi")).toEqual([
			{ lat: 40, lng: -74, value: 42 },
			{ lat: 40.1, lng: -74.1, value: 88 },
			{ lat: 40.2, lng: -74.2, value: 15 },
		]);
	});

	it("drops points with a missing or null value", () => {
		const raw = [
			{ current: { us_aqi: 42 } },
			{ current: { us_aqi: null } },
			{ current: {} },
		];
		expect(zipHeatmapPoints(grid, raw, "us_aqi")).toEqual([
			{ lat: 40, lng: -74, value: 42 },
		]);
	});

	it("drops points where the raw entry itself is missing", () => {
		const raw = [{ current: { us_aqi: 42 } }];
		expect(zipHeatmapPoints(grid, raw, "us_aqi")).toEqual([
			{ lat: 40, lng: -74, value: 42 },
		]);
	});
});
