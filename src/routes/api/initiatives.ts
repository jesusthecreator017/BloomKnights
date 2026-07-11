// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { initiatives } from "../../lib/initiatives";

export const Route = createFileRoute("/api/initiatives")({
	server: {
		handlers: {
			GET: () => Response.json(initiatives),
		},
	},
});
