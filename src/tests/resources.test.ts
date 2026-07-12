import { describe, expect, it } from "vitest";
import { CATEGORIES, resources, resourcesByCategory } from "../lib/resources";

const VALID_CATEGORIES = new Set(CATEGORIES.map((c) => c.id));
const VALID_TYPES = new Set(["action", "article", "org", "data"]);

describe("resources data", () => {
	it("has at least 6 entries per category", () => {
		for (const cat of CATEGORIES) {
			const count = resources.filter((r) => r.category === cat.id).length;
			expect(
				count,
				`category ${cat.id} has ${count} entries`,
			).toBeGreaterThanOrEqual(6);
		}
	});

	it("has unique ids", () => {
		const ids = resources.map((r) => r.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("only uses valid categories and types", () => {
		for (const r of resources) {
			expect(VALID_CATEGORIES.has(r.category)).toBe(true);
			expect(VALID_TYPES.has(r.type)).toBe(true);
		}
	});

	it("every entry has a non-empty title, description, and url", () => {
		for (const r of resources) {
			expect(r.title.length).toBeGreaterThan(0);
			expect(r.description.length).toBeGreaterThan(0);
			expect(r.url.startsWith("http") || r.url === "/map").toBe(true);
		}
	});

	it("only action-type entries may have an impact line", () => {
		for (const r of resources) {
			if (r.impact) expect(r.type).toBe("action");
		}
	});
});

describe("resourcesByCategory", () => {
	it("'all' returns every resource", () => {
		expect(resourcesByCategory("all")).toHaveLength(resources.length);
	});

	it("filters to just one category", () => {
		const carbon = resourcesByCategory("carbon");
		expect(carbon.length).toBeGreaterThan(0);
		expect(carbon.every((r) => r.category === "carbon")).toBe(true);
	});
});
