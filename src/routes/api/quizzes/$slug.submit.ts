// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { db } from "../../../db";
import { jsonError } from "../../../lib/api-utils";
import { auth } from "../../../lib/auth";
import { submitQuiz } from "../../../lib/quiz";

export const Route = createFileRoute("/api/quizzes/$slug/submit")({
	server: {
		handlers: {
			POST: async ({ request, params }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) return jsonError("sign in to submit a quiz", 401);

				let body: { answers?: unknown };
				try {
					body = await request.json();
				} catch {
					return jsonError("invalid JSON body", 400);
				}
				const answers = body.answers;
				if (
					!Array.isArray(answers) ||
					!answers.every((a) => typeof a === "number")
				) {
					return jsonError("body must be { answers: number[] }", 400);
				}

				const result = await submitQuiz(
					db,
					session.user.id,
					params.slug,
					answers,
				);
				if (result.status === "not_found")
					return jsonError("quiz not found", 404);
				if (result.status === "already_attempted") {
					return jsonError("you already completed this quiz", 409);
				}
				return Response.json(result);
			},
		},
	},
});
