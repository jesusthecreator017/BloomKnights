import { useQuery } from "@tanstack/react-query";
import { fetchJson, roundCoord } from "#/lib/api-client";
import type {
	AirQualityResponse,
	CoralResponse,
	OceanResponse,
	PlaceKind,
	PlacesResponse,
	UvSolarResponse,
} from "#/lib/api-types";

export type EnvironmentLayer =
	| "air-quality"
	| "uv-solar"
	| "ocean-coral"
	| "places";

export const ENVIRONMENT_LAYERS: { id: EnvironmentLayer; label: string }[] = [
	{ id: "air-quality", label: "Air Quality" },
	{ id: "uv-solar", label: "UV & Solar" },
	{ id: "ocean-coral", label: "Ocean & Reef" },
	{ id: "places", label: "Places" },
];

const STALE_TIME = 5 * 60 * 1000;

/** Ambient environment data for whatever point the map is centered on, shared by Map and Explorer. */
export function useEnvironmentLayers(
	center: { lat: number; lng: number },
	layer: EnvironmentLayer,
	placeKind: PlaceKind,
) {
	const key = { lat: roundCoord(center.lat), lng: roundCoord(center.lng) };
	const q = `lat=${key.lat}&lng=${key.lng}`;

	const air = useQuery({
		queryKey: ["air-quality", key],
		queryFn: () => fetchJson<AirQualityResponse>(`/api/air-quality?${q}`),
		enabled: layer === "air-quality",
		staleTime: STALE_TIME,
	});

	const uvSolar = useQuery({
		queryKey: ["uv-solar", key],
		queryFn: () => fetchJson<UvSolarResponse>(`/api/uv-solar?${q}`),
		enabled: layer === "uv-solar",
		staleTime: STALE_TIME,
	});

	const ocean = useQuery({
		queryKey: ["ocean", key],
		queryFn: () => fetchJson<OceanResponse>(`/api/ocean?${q}`),
		enabled: layer === "ocean-coral",
		staleTime: STALE_TIME,
	});

	const coral = useQuery({
		queryKey: ["coral", key],
		queryFn: () => fetchJson<CoralResponse>(`/api/coral?${q}`),
		enabled: layer === "ocean-coral",
		staleTime: STALE_TIME,
	});

	const places = useQuery({
		queryKey: ["places", key, placeKind],
		queryFn: () =>
			fetchJson<PlacesResponse>(`/api/places?${q}&kind=${placeKind}`),
		enabled: layer === "places",
		staleTime: STALE_TIME,
	});

	return {
		air: air.data,
		uvSolar: uvSolar.data,
		ocean: ocean.data,
		coral: coral.data,
		places: places.data,
	};
}
