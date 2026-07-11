import { describe, expect, it } from "vitest";
import { parseLatLng } from "../lib/api-utils";

function url(qs: string) {
	return new URL(`http://x/api?${qs}`);
}

describe("parseLatLng", () => {
	it("parses valid coordinates", () => {
		expect(parseLatLng(url("lat=25.76&lng=-80.19"))).toEqual({
			lat: 25.76,
			lng: -80.19,
		});
	});

	it("rejects missing params", () => {
		expect(parseLatLng(url("lat=25.76"))).toBeNull();
		expect(parseLatLng(url(""))).toBeNull();
	});

	it("rejects non-numeric params", () => {
		expect(parseLatLng(url("lat=abc&lng=-80"))).toBeNull();
	});

	it("rejects out-of-range coordinates", () => {
		expect(parseLatLng(url("lat=91&lng=0"))).toBeNull();
		expect(parseLatLng(url("lat=0&lng=181"))).toBeNull();
	});
});
