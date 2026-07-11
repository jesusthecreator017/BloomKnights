import { afterEach, describe, expect, it, vi } from "vitest";
import { rateLimit, resetRateLimits } from "../lib/rate-limit";

afterEach(() => {
	resetRateLimits();
	vi.useRealTimers();
});

describe("rateLimit", () => {
	it("allows up to the limit then blocks", () => {
		for (let i = 0; i < 3; i++) {
			expect(rateLimit("ip", 3, 1000).ok).toBe(true);
		}
		const blocked = rateLimit("ip", 3, 1000);
		expect(blocked.ok).toBe(false);
		expect(blocked.retryAfter).toBeGreaterThan(0);
	});

	it("tracks separate keys independently", () => {
		rateLimit("a", 1, 1000);
		expect(rateLimit("a", 1, 1000).ok).toBe(false);
		expect(rateLimit("b", 1, 1000).ok).toBe(true);
	});

	it("resets after the window passes", () => {
		vi.useFakeTimers();
		expect(rateLimit("ip", 1, 1000).ok).toBe(true);
		expect(rateLimit("ip", 1, 1000).ok).toBe(false);
		vi.setSystemTime(Date.now() + 1001);
		expect(rateLimit("ip", 1, 1000).ok).toBe(true);
	});
});
