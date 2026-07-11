import { createMiddleware, createStart } from "@tanstack/react-start";
import {
	acceptsJson,
	clientIp,
	hasJsonContentType,
	methodHasBody,
	requiresAuth,
} from "./lib/http-guard";
import { rateLimit } from "./lib/rate-limit";

function json(body: unknown, status: number, extraHeaders?: HeadersInit) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json", ...extraHeaders },
	});
}

// Global request middleware: enforces JSON-only + rate limiting on our /api/*
// routes. better-auth owns /api/auth/* (its own content types), so those only
// get a stricter rate limit. Everything non-API passes straight through.
const apiGuard = createMiddleware({ type: "request" }).server(
	async ({ request, pathname, next }) => {
		if (!pathname.startsWith("/api/")) return next();

		const isAuth = pathname.startsWith("/api/auth/");

		if (!isAuth) {
			// JSON-exclusive: reject clients that explicitly want XML/HTML/etc.
			if (!acceptsJson(request.headers.get("accept"))) {
				return json({ error: "this API only serves application/json" }, 406);
			}
			// writes must send a JSON body
			if (
				methodHasBody(request.method) &&
				!hasJsonContentType(request.headers.get("content-type"))
			) {
				return json({ error: "content-type must be application/json" }, 415);
			}
		}

		// IP rate limit: auth is stricter (brute-force target) than data reads.
		const ip = clientIp(request);
		const limit = isAuth
			? rateLimit(`auth:${ip}`, 20, 60_000)
			: rateLimit(`api:${ip}`, 100, 60_000);
		if (!limit.ok) {
			return json({ error: "rate limit exceeded, slow down" }, 429, {
				"retry-after": String(limit.retryAfter),
			});
		}

		// User-scoped endpoints (quizzes, leaderboard, user profile) require a
		// session. auth is imported lazily so this server-only module never
		// lands in the client bundle via the shared start instance.
		if (requiresAuth(pathname)) {
			const { auth } = await import("./lib/auth");
			const session = await auth.api.getSession({ headers: request.headers });
			if (!session) return json({ error: "sign in required" }, 401);
		}

		return next();
	},
);

export const startInstance = createStart(() => ({
	requestMiddleware: [apiGuard],
}));
