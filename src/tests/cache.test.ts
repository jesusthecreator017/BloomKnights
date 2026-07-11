import { afterEach, describe, expect, it, vi } from "vitest";
import { bust, cached, clearCache } from "../lib/cache";

afterEach(() => {
	clearCache();
	vi.useRealTimers();
});

describe("cached", () => {
	it("returns the cached value without re-calling within TTL", async () => {
		const fn = vi.fn().mockResolvedValue("value");
		expect(await cached("k", 1000, fn)).toBe("value");
		expect(await cached("k", 1000, fn)).toBe("value");
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("dedupes concurrent calls into one in-flight fetch", async () => {
		const fn = vi.fn(() => new Promise((r) => setTimeout(() => r("v"), 10)));
		const [a, b] = await Promise.all([
			cached("k", 1000, fn),
			cached("k", 1000, fn),
		]);
		expect(a).toBe("v");
		expect(b).toBe("v");
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("re-fetches after the TTL expires", async () => {
		vi.useFakeTimers();
		const fn = vi.fn().mockResolvedValue("x");
		await cached("k", 1000, fn);
		vi.setSystemTime(Date.now() + 1001);
		await cached("k", 1000, fn);
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it("does not cache a rejected fetch", async () => {
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new Error("boom"))
			.mockResolvedValueOnce("ok");
		await expect(cached("k", 1000, fn)).rejects.toThrow("boom");
		expect(await cached("k", 1000, fn)).toBe("ok");
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it("bust() drops entries by prefix", async () => {
		const fn = vi.fn().mockResolvedValue("v");
		await cached("leaderboard:top:10", 1000, fn);
		bust("leaderboard:");
		await cached("leaderboard:top:10", 1000, fn);
		expect(fn).toHaveBeenCalledTimes(2);
	});
});
