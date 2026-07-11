// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { events } from "../../lib/events";

export const Route = createFileRoute("/api/events")({
	server: {
		handlers: {
			GET: () => Response.json(events),
		},
	},
});
