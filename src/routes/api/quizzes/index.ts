// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { db } from "../../../db";
import { auth } from "../../../lib/auth";
import { listQuizzes } from "../../../lib/quiz";

export const Route = createFileRoute("/api/quizzes/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				return Response.json(await listQuizzes(db, session?.user.id));
			},
		},
	},
});
