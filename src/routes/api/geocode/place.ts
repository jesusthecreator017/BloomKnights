// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { jsonError } from "../../../lib/api-utils";
import {
	getPlaceDetails,
	PlacesNotConfiguredError,
	PlacesRequestError,
} from "../../../lib/places";

export const Route = createFileRoute("/api/geocode/place")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const id = url.searchParams.get("id")?.trim();
				if (!id) return jsonError("id is required", 400);

				try {
					const place = await getPlaceDetails(id);
					return Response.json(place);
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
