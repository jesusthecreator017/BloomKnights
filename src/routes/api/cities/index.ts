// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { db } from "../../../db";
import { listCities } from "../../../lib/quiz";

export const Route = createFileRoute("/api/cities/")({
	server: {
		handlers: {
			GET: async () => Response.json({ cities: await listCities(db) }),
		},
	},
});
