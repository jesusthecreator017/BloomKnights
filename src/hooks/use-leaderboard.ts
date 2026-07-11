import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "#/lib/api-client";
import type { LeaderboardResponse } from "#/lib/api-types";
import { useSession } from "#/lib/auth-client";

/** Shared query key so quiz submissions can invalidate it (see routes/quiz.$slug.tsx). */
export const leaderboardQueryKey = (limit: number) =>
	["leaderboard", limit] as const;

export function useLeaderboard(limit = 20) {
	const { data: session } = useSession();
	return useQuery({
		queryKey: leaderboardQueryKey(limit),
		queryFn: () =>
			fetchJson<LeaderboardResponse>(`/api/leaderboard?limit=${limit}`),
		// re-fetch once auth state resolves so `me` reflects the signed-in user
		enabled: session !== undefined,
	});
}
