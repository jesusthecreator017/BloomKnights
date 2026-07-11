import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "#/lib/api-client";
import type {
	CitiesResponse,
	CityScoresResponse,
	UserCityResponse,
} from "#/lib/api-types";
import { useSession } from "#/lib/auth-client";

/** Shared query key so joining a city can invalidate it. */
export const citiesQueryKey = () => ["cities"] as const;
export const userCityQueryKey = () => ["user-city"] as const;

export function useCities() {
	return useQuery({
		queryKey: citiesQueryKey(),
		queryFn: () => fetchJson<CitiesResponse>("/api/cities"),
		staleTime: 15_000,
		retry: (count) => count < 2,
	});
}

export function useCityScores() {
	return useQuery({
		queryKey: ["city-scores"],
		queryFn: () => fetchJson<CityScoresResponse>("/api/cities/scores"),
		staleTime: 5 * 60_000,
		retry: (count) => count < 2,
	});
}

export function useUserCity() {
	const { data: session } = useSession();
	return useQuery({
		queryKey: userCityQueryKey(),
		queryFn: () => fetchJson<UserCityResponse>("/api/user/city"),
		enabled: session !== undefined && session !== null,
		staleTime: 15_000,
		retry: (count) => count < 2,
	});
}
