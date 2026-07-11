// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { db } from "../../../db";
import { jsonError } from "../../../lib/api-utils";
import { getQuizForPlay } from "../../../lib/quiz";

export const Route = createFileRoute("/api/quizzes/$slug")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const quiz = await getQuizForPlay(db, params.slug);
				if (!quiz) return jsonError("quiz not found", 404);
				return Response.json(quiz);
			},
		},
	},
});
