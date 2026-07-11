// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { jsonError } from "../../../lib/api-utils";
import { auth } from "../../../lib/auth";
import {
	type AskContext,
	askGemini,
	GeminiNotConfiguredError,
	GeminiRequestError,
} from "../../../lib/gemini";
import { rateLimit } from "../../../lib/rate-limit";

const KINDS = new Set(["event", "initiative", "location"]);

function parseContext(body: unknown): AskContext | null {
	if (typeof body !== "object" || body === null) return null;
	const obj = body as Record<string, unknown>;
	const kind = obj.kind;
	const lat = obj.lat;
	const lng = obj.lng;
	if (typeof kind !== "string" || !KINDS.has(kind)) return null;
	if (typeof lat !== "number" || typeof lng !== "number") return null;

	return {
		kind: kind as AskContext["kind"],
		lat,
		lng,
		name: typeof obj.name === "string" ? obj.name.slice(0, 200) : undefined,
		description:
			typeof obj.description === "string"
				? obj.description.slice(0, 1000)
				: undefined,
		liveData:
			typeof obj.liveData === "string" ? obj.liveData.slice(0, 500) : undefined,
	};
}

export const Route = createFileRoute("/api/gemini/ask")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await auth.api.getSession({
					headers: request.headers,
				});
				if (!session) return jsonError("sign in to ask a question", 401);

				const limit = rateLimit(
					`gemini-ask:${session.user.id}`,
					10,
					5 * 60_000,
				);
				if (!limit.ok) {
					return new Response(
						JSON.stringify({
							error: "you're asking questions too fast — slow down",
						}),
						{
							status: 429,
							headers: {
								"content-type": "application/json",
								"retry-after": String(limit.retryAfter),
							},
						},
					);
				}

				let body: { question?: unknown; context?: unknown };
				try {
					body = await request.json();
				} catch {
					return jsonError("invalid JSON body", 400);
				}

				const question =
					typeof body.question === "string" ? body.question.trim() : "";
				if (!question) return jsonError("question is required", 400);
				if (question.length > 500) {
					return jsonError("question is too long (max 500 characters)", 400);
				}

				const context = parseContext(body.context);
				if (!context) return jsonError("invalid context", 400);

				try {
					const answer = await askGemini(question, context);
					return Response.json({ answer });
				} catch (err) {
					if (err instanceof GeminiNotConfiguredError) {
						return jsonError(err.message, 500);
					}
					if (err instanceof GeminiRequestError) {
						return jsonError(err.message, 502);
					}
					throw err;
				}
			},
		},
	},
});
