// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { db } from "../../../db";
import { jsonError } from "../../../lib/api-utils";
import { auth } from "../../../lib/auth";
import { getCityLeaderboard } from "../../../lib/quiz";

export const Route = createFileRoute("/api/cities/$slug")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const url = new URL(request.url);
				const limitParam = Number(url.searchParams.get("limit") ?? 20);
				const limit = Number.isFinite(limitParam)
					? Math.min(Math.max(Math.trunc(limitParam), 1), 100)
					: 20;

				const session = await auth.api.getSession({
					headers: request.headers,
				});
				const result = await getCityLeaderboard(
					db,
					params.slug,
					limit,
					session?.user.id,
				);
				if (!result) return jsonError("city not found", 404);
				return Response.json(result);
			},
		},
	},
});
