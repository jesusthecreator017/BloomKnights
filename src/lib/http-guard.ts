// Pure request-guard decisions, kept separate from the middleware wiring so
// they're unit-testable without the framework.

/**
 * Does the Accept header permit a JSON response? Absent or wildcard Accept is
 * fine; we only reject clients that explicitly ask for something else (e.g.
 * `application/xml`, `text/html` only) so this API stays JSON-exclusive.
 */
export function acceptsJson(accept: string | null): boolean {
	if (!accept) return true;
	const types = accept
		.split(",")
		.map((t) => t.split(";")[0].trim().toLowerCase());
	return types.some(
		(t) =>
			t === "application/json" ||
			t === "application/*" ||
			t === "*/*" ||
			t.endsWith("+json"),
	);
}

/** Methods that carry a request body we require to be JSON. */
export function methodHasBody(method: string): boolean {
	return method === "POST" || method === "PUT" || method === "PATCH";
}

/** Is the Content-Type JSON (ignoring charset etc.)? */
export function hasJsonContentType(contentType: string | null): boolean {
	return (contentType ?? "").toLowerCase().includes("application/json");
}

/**
 * API prefixes that require a signed-in user. Everything else under /api/*
 * (environmental data, cities, geocoding) stays public. Add a prefix here when
 * a new user-scoped feature lands.
 */
const AUTH_REQUIRED_PREFIXES = [
	"/api/quizzes",
	"/api/leaderboard",
	"/api/user",
	"/api/cities",
];

/** Does this API path require an authenticated session? */
export function requiresAuth(pathname: string): boolean {
	return AUTH_REQUIRED_PREFIXES.some(
		(p) => pathname === p || pathname.startsWith(`${p}/`),
	);
}

/** Best-effort client IP for rate-limit bucketing. */
export function clientIp(request: Request): string {
	const fwd = request.headers.get("x-forwarded-for");
	if (fwd) return fwd.split(",")[0].trim();
	return (
		request.headers.get("x-real-ip") ??
		request.headers.get("cf-connecting-ip") ??
		"local"
	);
}
