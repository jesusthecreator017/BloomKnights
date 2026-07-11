// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { db } from "../../../db";
import { jsonError } from "../../../lib/api-utils";
import { checkAnswer } from "../../../lib/quiz";

export const Route = createFileRoute("/api/quizzes/$slug/check")({
	server: {
		handlers: {
			POST: async ({ request, params }) => {
				let body: { questionId?: unknown; answer?: unknown };
				try {
					body = await request.json();
				} catch {
					return jsonError("invalid JSON body", 400);
				}
				const { questionId, answer } = body;
				if (typeof questionId !== "number" || typeof answer !== "number") {
					return jsonError(
						"body must be { questionId: number, answer: number }",
						400,
					);
				}

				const result = await checkAnswer(db, params.slug, questionId, answer);
				if (!result) return jsonError("question not found", 404);
				return Response.json(result);
			},
		},
	},
});
