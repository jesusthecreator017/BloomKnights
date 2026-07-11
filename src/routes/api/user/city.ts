// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { db } from "../../../db";
import { jsonError } from "../../../lib/api-utils";
import { auth } from "../../../lib/auth";
import { getUserCity, joinCity } from "../../../lib/quiz";

export const Route = createFileRoute("/api/user/city")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await auth.api.getSession({
					headers: request.headers,
				});
				if (!session) return jsonError("sign in to see your city", 401);
				const city = await getUserCity(db, session.user.id);
				return Response.json({ city });
			},
			POST: async ({ request }) => {
				const session = await auth.api.getSession({
					headers: request.headers,
				});
				if (!session) return jsonError("sign in to join a city", 401);

				let body: { citySlug?: unknown };
				try {
					body = await request.json();
				} catch {
					return jsonError("invalid JSON body", 400);
				}
				if (typeof body.citySlug !== "string" || !body.citySlug) {
					return jsonError("body must be { citySlug: string }", 400);
				}

				const city = await joinCity(db, session.user.id, body.citySlug);
				if (!city) return jsonError("city not found", 404);
				return Response.json({ city });
			},
		},
	},
});
