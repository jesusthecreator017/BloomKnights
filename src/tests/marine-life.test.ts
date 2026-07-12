import { describe, expect, it } from "vitest";
import { aggregateObisResults } from "../lib/marine-life";

describe("aggregateObisResults", () => {
	it("counts sightings per species and sorts descending", () => {
		const results = [
			{
				scientificName: "Lucania parva",
				decimalLatitude: 25.7,
				decimalLongitude: -80.1,
			},
			{
				scientificName: "Lucania parva",
				decimalLatitude: 25.8,
				decimalLongitude: -80.2,
			},
			{
				scientificName: "Fundulus grandis",
				decimalLatitude: 25.9,
				decimalLongitude: -80.3,
			},
		];
		const { species } = aggregateObisResults(results);
		expect(species).toEqual([
			{ name: "Lucania parva", count: 2 },
			{ name: "Fundulus grandis", count: 1 },
		]);
	});

	it("caps species at the top 25 by count", () => {
		const results = Array.from({ length: 30 }, (_, i) => ({
			scientificName: `Species ${i}`,
			decimalLatitude: 1,
			decimalLongitude: 1,
		}));
		const { species } = aggregateObisResults(results);
		expect(species).toHaveLength(25);
	});

	it("collects every record's coordinates into points, regardless of species name", () => {
		const results = [
			{ decimalLatitude: 25.7, decimalLongitude: -80.1 },
			{ scientificName: "X", decimalLatitude: 26, decimalLongitude: -81 },
		];
		const { points } = aggregateObisResults(results);
		expect(points).toEqual([
			{ lat: 25.7, lng: -80.1 },
			{ lat: 26, lng: -81 },
		]);
	});

	it("skips points with missing or non-numeric coordinates", () => {
		const results = [
			{ scientificName: "X" },
			{ scientificName: "Y", decimalLatitude: 1, decimalLongitude: undefined },
		];
		const { points } = aggregateObisResults(results);
		expect(points).toEqual([]);
	});
});
