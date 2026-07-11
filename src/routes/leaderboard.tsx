import { createFileRoute, Link } from "@tanstack/react-router";
import { Medal, Trophy } from "lucide-react";
import { GlassBadge } from "#/components/ui/glass-badge";
import {
	GlassCard,
	GlassCardContent,
	GlassCardHeader,
	GlassCardTitle,
} from "#/components/ui/glass-card";
import { useLeaderboard } from "#/hooks/use-leaderboard";
import { useSession } from "#/lib/auth-client";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/leaderboard")({
	component: LeaderboardPage,
});

const MEDAL_CLASS: Record<number, string> = {
	1: "text-yellow-400",
	2: "text-slate-300",
	3: "text-amber-600",
};

function LeaderboardPage() {
	const { data: session } = useSession();
	const { data, isLoading, error } = useLeaderboard(20);

	const meInTop =
		data?.entries.some((e) => e.userId === data.me?.userId) ?? false;

	return (
		<div className="mx-auto max-w-2xl px-4 py-16">
			<div className="flex items-center gap-2">
				<Trophy className="h-6 w-6 text-forest-400" />
				<h1 className="text-3xl font-bold">Leaderboard</h1>
			</div>
			<p className="mt-2 text-white/70">
				Points come from quiz scores.{" "}
				{!session && (
					<>
						<Link to="/login" className="text-forest-400 hover:underline">
							Sign in
						</Link>{" "}
						and take a{" "}
						<Link to="/quiz" className="text-forest-400 hover:underline">
							quiz
						</Link>{" "}
						to get on the board.
					</>
				)}
			</p>

			{isLoading && <p className="mt-8 text-white/50">Loading leaderboard…</p>}
			{error && (
				<p className="mt-8 text-red-300">
					Couldn't load the leaderboard right now.
				</p>
			)}

			{data && (
				<GlassCard className="mt-8">
					<GlassCardContent className="divide-y divide-white/10 p-0">
						{data.entries.length === 0 ? (
							<p className="p-6 text-center text-sm text-white/50">
								No scores yet — be the first to take a quiz.
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
			)}

			{data?.me && !meInTop && (
				<GlassCard className="mt-4">
					<GlassCardHeader>
						<GlassCardTitle className="text-sm text-white/60">
							Your rank
						</GlassCardTitle>
					</GlassCardHeader>
					<GlassCardContent className="pt-0">
						<Row entry={data.me} isMe />
					</GlassCardContent>
				</GlassCard>
			)}
		</div>
	);
}

function Row({
	entry,
	isMe,
}: {
	entry: { rank: number; name: string; points: number; quizzesTaken: number };
	isMe: boolean;
}) {
	const medalColor = MEDAL_CLASS[entry.rank];

	return (
		<div
			className={cn(
				"flex items-center gap-4 px-4 py-3",
				isMe && "rounded-xl bg-forest-500/15 ring-1 ring-forest-400/40",
			)}
		>
			<span
				className={cn(
					"flex w-8 shrink-0 items-center gap-1 font-semibold",
					medalColor ?? "text-white/50",
				)}
			>
				{medalColor && <Medal className="h-4 w-4" />}
				{entry.rank}
			</span>
			<div className="flex-1">
				<p className="font-medium">
					{entry.name}
					{isMe && <span className="ml-2 text-xs text-forest-400">(you)</span>}
				</p>
				<p className="text-xs text-white/50">
					{entry.quizzesTaken} quiz{entry.quizzesTaken === 1 ? "" : "zes"} taken
				</p>
			</div>
			<GlassBadge variant="success">{entry.points} pts</GlassBadge>
		</div>
	);
}
