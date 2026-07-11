// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../../lib/auth";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			ANY: ({ request }) => auth.handler(request),
		},
	},
});
