// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { emissionsCache, quizzes } from "../../../db/schema";
import { jsonError } from "../../../lib/api-utils";
import { auth } from "../../../lib/auth";
import {
	GeminiNotConfiguredError,
	GeminiRequestError,
	generateQuiz,
} from "../../../lib/gemini";
import { insertGeneratedQuiz } from "../../../lib/quiz";
import { rateLimit } from "../../../lib/rate-limit";

const ACT_CONTEXT =
	"Join community solar, swap one car trip a day for walking/biking/transit, " +
	"switch to a heat pump, eat plant-forward meals a couple times a week, " +
	"repair instead of replace, and show up to local cleanups and clean-energy events.";

async function getEmissionsContext(): Promise<string | undefined> {
	try {
		const [row] = await db
			.select()
			.from(emissionsCache)
			.where(eq(emissionsCache.country, "USA"));
		const entries = row?.data as
			| Array<{
					rank: number;
					emissions: { co2e_100yr: number };
					worldEmissions: { co2e_100yr: number };
			  }>
			| undefined;
		const entry = entries?.[0];
		if (!entry) return undefined;
		const share =
			(entry.emissions.co2e_100yr / entry.worldEmissions.co2e_100yr) * 100;
		return `USA is ranked #${entry.rank} globally and responsible for about ${share.toFixed(1)}% of tracked global CO2e emissions (Climate TRACE).`;
	} catch {
		return undefined;
	}
}

export const Route = createFileRoute("/api/quizzes/generate")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await auth.api.getSession({
					headers: request.headers,
				});
				if (!session) return jsonError("sign in to generate a quiz", 401);

				const limit = rateLimit(`gemini:${session.user.id}`, 5, 5 * 60_000);
				if (!limit.ok) {
					return new Response(
						JSON.stringify({
							error: "you're generating quizzes too fast — slow down",
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

				let body: { topic?: unknown };
				try {
					body = await request.json();
				} catch {
					return jsonError("invalid JSON body", 400);
				}
				let topic: string | undefined;
				if (body.topic !== undefined) {
					if (typeof body.topic !== "string") {
						return jsonError("topic must be a string", 400);
					}
					topic = body.topic.trim().slice(0, 200) || undefined;
				}

				const existing = await db
					.select({ title: quizzes.title })
					.from(quizzes);

				try {
					const generated = await generateQuiz({
						topic,
						existingTitles: existing.map((q) => q.title),
						actContext: ACT_CONTEXT,
						emissionsContext: await getEmissionsContext(),
					});
					const quiz = await insertGeneratedQuiz(db, {
						...generated,
						createdBy: session.user.id,
					});
					return Response.json(quiz);
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
