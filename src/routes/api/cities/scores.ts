// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { db } from "../../../db";
import { getCityScores } from "../../../lib/city-scores";

export const Route = createFileRoute("/api/cities/scores")({
	server: {
		handlers: {
			GET: async () => Response.json({ scores: await getCityScores(db) }),
		},
	},
});
