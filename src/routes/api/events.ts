// side-effect import: registers the `server` route option types from TanStack Start
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { parseLatLng } from "../../lib/api-utils";
import { getEvents } from "../../lib/events";

// default map center (Orlando) when the client doesn't pass coordinates,
// which keeps pre-existing parameterless calls working
const DEFAULT = { lat: 28.5384, lng: -81.3789 };

export const Route = createFileRoute("/api/events")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const point = parseLatLng(new URL(request.url)) ?? DEFAULT;
				return Response.json(await getEvents(point.lat, point.lng));
			},
		},
	},
});
