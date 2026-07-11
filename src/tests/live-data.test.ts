import { describe, expect, it } from "vitest";
import { formatWorldBankFacts } from "../lib/environment-facts";
import { validateEcoEvents } from "../lib/events";
import { mapPlacesToInitiatives } from "../lib/initiatives";

const goodEvent = {
	id: "lake-cleanup",
	name: "Lake Eola Cleanup",
	description: "Volunteer shoreline cleanup.",
	category: "cleanup",
	date: "2026-08-01",
	lat: 28.54,
	lng: -81.37,
	city: "Orlando",
	url: "https://example.org/cleanup",
};

describe("validateEcoEvents", () => {
	it("accepts valid events and keeps a valid volunteerUrl", () => {
		const out = validateEcoEvents([
			{ ...goodEvent, volunteerUrl: "https://example.org/signup" },
		]);
		expect(out).toHaveLength(1);
		expect(out[0].volunteerUrl).toBe("https://example.org/signup");
	});

	it("drops rows with bad dates, coords, or non-http urls", () => {
		expect(
			validateEcoEvents([
				{ ...goodEvent, date: "next tuesday" },
				{ ...goodEvent, lat: 123 },
				{ ...goodEvent, url: "javascript:alert(1)" },
				"not an object",
			]),
		).toHaveLength(0);
	});

	it("strips an invalid volunteerUrl instead of rejecting the event", () => {
		const out = validateEcoEvents([{ ...goodEvent, volunteerUrl: "nope" }]);
		expect(out).toHaveLength(1);
		expect(out[0].volunteerUrl).toBeUndefined();
	});

	it("returns [] for non-arrays", () => {
		expect(validateEcoEvents({ events: [] })).toEqual([]);
		expect(validateEcoEvents(null)).toEqual([]);
	});
});

describe("mapPlacesToInitiatives", () => {
	it("maps a Places searchText body to initiatives", () => {
		const out = mapPlacesToInitiatives({
			places: [
				{
					id: "abc123",
					displayName: { text: "Conservation Florida" },
					formattedAddress: "1527 E Concord St, Orlando, FL 32803, USA",
					location: { latitude: 28.55, longitude: -81.36 },
					websiteUri: "http://conservationfla.org/",
					types: ["non_profit_organization", "establishment"],
				},
			],
		});
		expect(out).toHaveLength(1);
		expect(out[0]).toMatchObject({
			id: "abc123",
			name: "Conservation Florida",
			category: "nonprofit",
			city: "Orlando",
			website: "http://conservationfla.org/",
		});
	});

	it("skips places missing id, name, or location", () => {
		const out = mapPlacesToInitiatives({
			places: [{ id: "x" }, { displayName: { text: "No id" } }],
		});
		expect(out).toEqual([]);
	});

	it("returns [] for junk bodies", () => {
		expect(mapPlacesToInitiatives(null)).toEqual([]);
		expect(mapPlacesToInitiatives({})).toEqual([]);
	});
});

describe("formatWorldBankFacts", () => {
	it("formats US and World rows into fact strings", () => {
		const body = [
			{ page: 1 },
			[
				{
					country: { value: "United States" },
					date: "2024",
					value: 13.6238,
				},
				{ country: { value: "World" }, date: "2024", value: 4.6938 },
			],
		];
		const facts = formatWorldBankFacts(
			body,
			"CO2 emissions per capita",
			"tonnes CO2e per person",
		);
		expect(facts).toEqual([
			"United States CO2 emissions per capita: 13.6 tonnes CO2e per person (2024, World Bank).",
			"Global CO2 emissions per capita: 4.7 tonnes CO2e per person (2024, World Bank).",
		]);
	});

	it("skips null values and tolerates junk", () => {
		expect(
			formatWorldBankFacts(
				[{ page: 1 }, [{ country: { value: "World" }, value: null }]],
				"x",
				"y",
			),
		).toEqual([]);
		expect(formatWorldBankFacts({ error: true }, "x", "y")).toEqual([]);
	});
});
