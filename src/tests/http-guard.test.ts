import { describe, expect, it } from "vitest";
import {
	acceptsJson,
	clientIp,
	hasJsonContentType,
	methodHasBody,
} from "../lib/http-guard";

describe("acceptsJson", () => {
	it("allows absent, wildcard, and json Accept headers", () => {
		expect(acceptsJson(null)).toBe(true);
		expect(acceptsJson("*/*")).toBe(true);
		expect(acceptsJson("application/json")).toBe(true);
		expect(acceptsJson("text/html, application/json")).toBe(true);
		expect(acceptsJson("application/vnd.api+json")).toBe(true);
	});

	it("rejects Accept headers that exclude json", () => {
		expect(acceptsJson("application/xml")).toBe(false);
		expect(acceptsJson("text/html")).toBe(false);
		expect(acceptsJson("application/xml, text/xml")).toBe(false);
	});
});

describe("methodHasBody / hasJsonContentType", () => {
	it("flags write methods", () => {
		expect(methodHasBody("POST")).toBe(true);
		expect(methodHasBody("PUT")).toBe(true);
		expect(methodHasBody("GET")).toBe(false);
	});

	it("detects a json content-type ignoring charset", () => {
		expect(hasJsonContentType("application/json")).toBe(true);
		expect(hasJsonContentType("application/json; charset=utf-8")).toBe(true);
		expect(hasJsonContentType("application/x-www-form-urlencoded")).toBe(false);
		expect(hasJsonContentType(null)).toBe(false);
	});
});

describe("clientIp", () => {
	it("prefers the first x-forwarded-for entry", () => {
		const req = new Request("http://x", {
			headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
		});
		expect(clientIp(req)).toBe("1.2.3.4");
	});

	it("falls back to 'local' with no headers", () => {
		expect(clientIp(new Request("http://x"))).toBe("local");
	});
});
