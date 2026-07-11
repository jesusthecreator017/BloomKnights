// Process-local TTL cache. Single-instance only — resets on restart, which is
// fine for this app: it exists to dedupe third-party API calls, not to persist.
interface Entry {
	promise: Promise<unknown>;
	expires: number;
}

const store = new Map<string, Entry>();

/**
 * Get-or-fetch with a TTL. Concurrent calls for the same key share one
 * in-flight promise (thundering-herd protection); a rejected fetch is evicted
 * so the next caller retries instead of caching the failure.
 */
export function cached<T>(
	key: string,
	ttlMs: number,
	fn: () => Promise<T>,
): Promise<T> {
	const hit = store.get(key);
	if (hit && hit.expires > Date.now()) return hit.promise as Promise<T>;

	const promise = fn().catch((err) => {
		store.delete(key);
		throw err;
	});
	store.set(key, { promise, expires: Date.now() + ttlMs });
	return promise as Promise<T>;
}

/** Drop every entry whose key starts with `prefix` (e.g. after a write). */
export function bust(prefix: string): void {
	for (const key of store.keys()) {
		if (key.startsWith(prefix)) store.delete(key);
	}
}

/** Test/maintenance helper. */
export function clearCache(): void {
	store.clear();
}
