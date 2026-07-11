import { cached } from "./cache";

// Places API (New) — https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
// Requires a server-side key with "Places API (New)" enabled in Google Cloud Console.
// Kept separate from VITE_GOOGLE_MAPS_API_KEY (client-exposed, HTTP-referrer restricted):
// this key is never sent to the browser, so it should be IP-restricted instead.
const PLACES_BASE = "https://places.googleapis.com/v1";

export class PlacesNotConfiguredError extends Error {
	constructor() {
		super("Places API (New) isn't configured — set GOOGLE_PLACES_API_KEY");
		this.name = "PlacesNotConfiguredError";
	}
}

export class PlacesRequestError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "PlacesRequestError";
	}
}

function apiKey(): string {
	const key = process.env.GOOGLE_PLACES_API_KEY;
	if (!key) throw new PlacesNotConfiguredError();
	return key;
}

export interface PlaceSuggestion {
	placeId: string;
	text: string;
}

/** Autocomplete (New): https://places.googleapis.com/v1/places:autocomplete */
export async function autocompletePlaces(
	input: string,
): Promise<PlaceSuggestion[]> {
	const key = apiKey();

	return cached(
		`places:autocomplete:${input.toLowerCase()}`,
		60_000,
		async () => {
			const res = await fetch(`${PLACES_BASE}/places:autocomplete`, {
				method: "POST",
				signal: AbortSignal.timeout(10_000),
				headers: {
					"content-type": "application/json",
					"X-Goog-Api-Key": key,
				},
				body: JSON.stringify({ input }),
			});
			if (!res.ok) {
				throw new PlacesRequestError(
					`Places autocomplete responded ${res.status}`,
				);
			}

			const body = (await res.json()) as {
				suggestions?: Array<{
					placePrediction?: { placeId?: string; text?: { text?: string } };
				}>;
			};

			return (body.suggestions ?? [])
				.map((s) => ({
					placeId: s.placePrediction?.placeId,
					text: s.placePrediction?.text?.text,
				}))
				.filter(
					(s): s is PlaceSuggestion =>
						typeof s.placeId === "string" && typeof s.text === "string",
				);
		},
	);
}

export interface PlaceDetails {
	formattedAddress: string;
	lat: number;
	lng: number;
}

/** Place Details (New): https://places.googleapis.com/v1/places/{placeId} */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
	const key = apiKey();

	return cached(`places:details:${placeId}`, 24 * 60 * 60_000, async () => {
		const url = `${PLACES_BASE}/places/${encodeURIComponent(placeId)}`;
		const res = await fetch(url, {
			signal: AbortSignal.timeout(10_000),
			headers: {
				"X-Goog-Api-Key": key,
				"X-Goog-FieldMask": "formattedAddress,location",
			},
		});
		if (!res.ok) {
			throw new PlacesRequestError(`Place details responded ${res.status}`);
		}

		const body = (await res.json()) as {
			formattedAddress?: string;
			location?: { latitude?: number; longitude?: number };
		};
		if (
			!body.formattedAddress ||
			typeof body.location?.latitude !== "number" ||
			typeof body.location?.longitude !== "number"
		) {
			throw new PlacesRequestError("Place details returned an unusable shape");
		}

		return {
			formattedAddress: body.formattedAddress,
			lat: body.location.latitude,
			lng: body.location.longitude,
		};
	});
}
