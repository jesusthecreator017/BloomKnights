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
			{ name: "Portland", aqi: 16, color: "#66c03e" },
			{ name: "Los Angeles", aqi: 90, color: "#f8b11e" },
		]);
	});

	it("returns [] for an empty list", () => {
		expect(cityAqiChartData([])).toEqual([]);
	});
});
