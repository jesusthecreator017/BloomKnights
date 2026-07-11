// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { db } from "../../db";
import { auth } from "../../lib/auth";
import { getLeaderboard } from "../../lib/quiz";

export const Route = createFileRoute("/api/leaderboard")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const limitParam = Number(url.searchParams.get("limit") ?? 20);
				const limit = Number.isFinite(limitParam)
					? Math.min(Math.max(Math.trunc(limitParam), 1), 100)
					: 20;

				const session = await auth.api.getSession({ headers: request.headers });
				const board = await getLeaderboard(db, limit, session?.user.id);
				return Response.json(board);
			},
		},
	},
});
