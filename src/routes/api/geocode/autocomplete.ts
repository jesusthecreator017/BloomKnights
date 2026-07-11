// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { jsonError } from "../../../lib/api-utils";
import {
	autocompletePlaces,
	PlacesNotConfiguredError,
	PlacesRequestError,
} from "../../../lib/places";

export const Route = createFileRoute("/api/geocode/autocomplete")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const input = url.searchParams.get("input")?.trim();
				if (!input) return jsonError("input is required", 400);

				try {
					const suggestions = await autocompletePlaces(input);
					return Response.json({ suggestions });
				} catch (err) {
					if (err instanceof PlacesNotConfiguredError) {
						return jsonError(err.message, 500);
					}
					if (err instanceof PlacesRequestError) {
						return jsonError(err.message, 502);
					}
					throw err;
				}
			},
		},
	},
});
