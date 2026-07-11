// Process-local fixed-window rate limiter. Single-instance only — good enough
// to stop one client hammering the API (and, transitively, upstream APIs).
interface Window {
	count: number;
	reset: number;
}

const windows = new Map<string, Window>();

export interface RateLimitResult {
	ok: boolean;
	/** Seconds until the window resets (only meaningful when !ok). */
	retryAfter: number;
}

export function rateLimit(
	key: string,
	limit: number,
	windowMs: number,
): RateLimitResult {
	const now = Date.now();
	const w = windows.get(key);

	if (!w || w.reset <= now) {
		windows.set(key, { count: 1, reset: now + windowMs });
		return { ok: true, retryAfter: 0 };
	}

	w.count += 1;
	if (w.count > limit) {
		return { ok: false, retryAfter: Math.ceil((w.reset - now) / 1000) };
	}
	return { ok: true, retryAfter: 0 };
}

/** Test helper. */
export function resetRateLimits(): void {
	windows.clear();
}
