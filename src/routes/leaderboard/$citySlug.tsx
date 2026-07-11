import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Trophy } from "lucide-react";
import { GlassCard, GlassCardContent } from "#/components/ui/glass-card";
import { ApiClientError, fetchJson } from "#/lib/api-client";
import type { CityDetailResponse } from "#/lib/api-types";
import { Row } from "./index";

export const Route = createFileRoute("/leaderboard/$citySlug")({
	component: CityLeaderboardPage,
});

function CityLeaderboardPage() {
	const { citySlug } = Route.useParams();
	const { data, isLoading, error } = useQuery({
		queryKey: ["city-leaderboard", citySlug],
		queryFn: () => fetchJson<CityDetailResponse>(`/api/cities/${citySlug}`),
		staleTime: 15_000,
		retry: (count) => count < 2,
	});

	return (
		<div className="mx-auto max-w-2xl px-4 py-16">
			<Link
				to="/leaderboard"
				className="inline-flex items-center gap-1 text-sm text-forest-400 hover:underline"
			>
				<ArrowLeft className="h-4 w-4" /> All cities
			</Link>

			{isLoading && <p className="mt-6 text-muted-foreground">Loading…</p>}
			{error && (
				<p className="mt-6 text-red-400">
					{error instanceof ApiClientError && error.status === 404
						? "That city doesn't exist."
						: "Couldn't load that city's leaderboard right now."}
				</p>
			)}

			{data && (
				<>
					<div className="mt-4 flex items-center gap-2">
						<Trophy className="h-6 w-6 text-forest-400" />
						<h1 className="text-3xl font-bold">{data.city.name}</h1>
					</div>
					<p className="mt-1 text-muted-foreground">
						{data.city.country} · top contributors
					</p>

					<GlassCard className="mt-8">
						<GlassCardContent className="divide-y divide-white/10 p-0">
							{data.entries.length === 0 ? (
								<p className="p-6 text-center text-sm text-white/50">
									No one from {data.city.name} has scored yet — be the first.
								</p>
							) : (
								data.entries.map((entry) => (
									<Row
										key={entry.userId}
										entry={entry}
										isMe={entry.userId === data.me?.userId}
									/>
								))
							)}
						</GlassCardContent>
					</GlassCard>

					{data.me &&
						!data.entries.some((e) => e.userId === data.me?.userId) && (
							<GlassCard className="mt-4">
								<GlassCardContent className="pt-6">
									<Row entry={data.me} isMe />
								</GlassCardContent>
							</GlassCard>
						)}
				</>
			)}
		</div>
	);
}
