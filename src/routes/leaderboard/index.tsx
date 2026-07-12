import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Leaf, Medal, Trophy, Users } from "lucide-react";
import { useState } from "react";
import { GlassBadge } from "#/components/ui/glass-badge";
import { GlassButton } from "#/components/ui/glass-button";
import {
	GlassCard,
	GlassCardContent,
	GlassCardHeader,
	GlassCardTitle,
} from "#/components/ui/glass-card";
import {
	GlassDialog,
	GlassDialogContent,
	GlassDialogDescription,
	GlassDialogHeader,
	GlassDialogTitle,
} from "#/components/ui/glass-dialog";
import {
	GlassTabs,
	GlassTabsContent,
	GlassTabsList,
	GlassTabsTrigger,
} from "#/components/ui/glass-tabs";
import {
	citiesQueryKey,
	useCities,
	useCityScores,
	userCityQueryKey,
	useUserCity,
} from "#/hooks/use-cities";
import { useLeaderboard } from "#/hooks/use-leaderboard";
import { ApiClientError, fetchJson } from "#/lib/api-client";
import type {
	City,
	CityLeaderboardEntry,
	CityScore,
	UserCityResponse,
} from "#/lib/api-types";
import { useSession } from "#/lib/auth-client";
import { countryFlag } from "#/lib/country";
import { aqiColor } from "#/lib/environment-format";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/leaderboard/")({
	component: LeaderboardPage,
});

export const MEDAL_CLASS: Record<number, string> = {
	1: "text-yellow-400",
	2: "text-slate-300",
	3: "text-amber-600",
};

function LeaderboardPage() {
	return (
		<div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
			<div className="flex items-center gap-2">
				<Trophy className="h-6 w-6 text-forest-400" />
				<h1 className="text-3xl font-bold">Leaderboard</h1>
			</div>
			<p className="mt-2 text-muted-foreground">
				Join your city and stack points with your neighbors, or check where you
				personally rank.
			</p>

			<GlassTabs defaultValue="cities" className="mt-8">
				<GlassTabsList>
					<GlassTabsTrigger value="cities">Cities</GlassTabsTrigger>
					<GlassTabsTrigger value="individuals">
						Top Individuals
					</GlassTabsTrigger>
				</GlassTabsList>
				<GlassTabsContent value="cities">
					<CitiesLeaderboard />
				</GlassTabsContent>
				<GlassTabsContent value="individuals">
					<IndividualsLeaderboard />
				</GlassTabsContent>
			</GlassTabs>
		</div>
	);
}

type CityView = "community" | "environmental";

function CitiesLeaderboard() {
	const { data: session } = useSession();
	const { data, isLoading, error } = useCities();
	const { data: userCity } = useUserCity();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [view, setView] = useState<CityView>("community");

	return (
		<div>
			<JoinCityCard
				signedIn={!!session}
				myCity={userCity?.city ?? null}
				onOpenPicker={() => setDialogOpen(true)}
			/>

			<div className="mt-4 flex gap-1 rounded-full border border-white/10 bg-white/5 p-1">
				<button
					type="button"
					onClick={() => setView("community")}
					className={cn(
						"flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition",
						view === "community"
							? "bg-forest-500/25 text-forest-100"
							: "text-white/60 hover:text-white/80",
					)}
				>
					<Users className="h-3.5 w-3.5" /> Community Score
				</button>
				<button
					type="button"
					onClick={() => setView("environmental")}
					className={cn(
						"flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition",
						view === "environmental"
							? "bg-forest-500/25 text-forest-100"
							: "text-white/60 hover:text-white/80",
					)}
				>
					<Leaf className="h-3.5 w-3.5" /> Environmental Score
				</button>
			</div>

			{view === "community" ? (
				<>
					{isLoading && (
						<p className="mt-6 text-muted-foreground">Loading cities…</p>
					)}
					{error && (
						<p className="mt-6 text-red-400">Couldn't load cities right now.</p>
					)}

					{data && (
						<GlassCard className="mt-4">
							<GlassCardContent className="divide-y divide-white/10 p-0">
								{data.cities.map((city) => (
									<CityRow
										key={city.slug}
										city={city}
										isMine={userCity?.city?.slug === city.slug}
									/>
								))}
							</GlassCardContent>
						</GlassCard>
					)}
				</>
			) : (
				<EnvironmentalScoreList />
			)}

			<CityPickerDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				cities={data?.cities ?? []}
			/>
		</div>
	);
}

function EnvironmentalScoreList() {
	const { data, isLoading, error } = useCityScores();

	return (
		<>
			<p className="mt-4 text-white/50 text-xs">
				Live US AQI at each city's center, refreshed daily from Open-Meteo —
				lower is cleaner air.
			</p>
			{isLoading && (
				<p className="mt-6 text-muted-foreground">Loading live air quality…</p>
			)}
			{error && (
				<p className="mt-6 text-red-400">
					Couldn't load live environmental scores right now.
				</p>
			)}
			{data && (
				<GlassCard className="mt-4">
					<GlassCardContent className="divide-y divide-white/10 p-0">
						{data.scores.map((score, i) => (
							<ScoreRow key={score.slug} score={score} rank={i + 1} />
						))}
					</GlassCardContent>
				</GlassCard>
			)}
		</>
	);
}

function ScoreRow({ score, rank }: { score: CityScore; rank: number }) {
	const medalColor = MEDAL_CLASS[rank];
	return (
		<Link
			to="/leaderboard/$citySlug"
			params={{ citySlug: score.slug }}
			className="block"
		>
			<div className="flex items-center gap-4 px-4 py-3 transition hover:bg-white/5">
				<span
					className={cn(
						"flex w-8 shrink-0 items-center gap-1 font-semibold",
						medalColor ?? "text-white/50",
					)}
				>
					{medalColor && <Medal className="h-4 w-4" />}
					{rank}
				</span>
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium">{score.name}</p>
					<p className="flex items-center gap-1 text-white/50 text-xs">
						{countryFlag(score.country) && (
							<span>{countryFlag(score.country)}</span>
						)}
						{score.country}
					</p>
				</div>
				<GlassBadge
					style={{
						backgroundColor: `${aqiColor(score.aqi)}33`,
						borderColor: `${aqiColor(score.aqi)}66`,
						color: aqiColor(score.aqi),
					}}
				>
					AQI {score.aqi}
				</GlassBadge>
			</div>
		</Link>
	);
}

function JoinCityCard({
	signedIn,
	myCity,
	onOpenPicker,
}: {
	signedIn: boolean;
	myCity: City | null;
	onOpenPicker: () => void;
}) {
	if (!signedIn) {
		return (
			<GlassCard glowEffect={false}>
				<GlassCardContent className="pt-6">
					<p className="text-sm text-white/70">
						<Link to="/login" className="text-forest-400 hover:underline">
							Sign in
						</Link>{" "}
						to join your city and add your points to its total.
					</p>
				</GlassCardContent>
			</GlassCard>
		);
	}

	return (
		<GlassCard glowEffect={false}>
			<GlassCardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
				<div className="flex items-center gap-2 text-sm text-white/80">
					<Building2 className="h-4 w-4 text-forest-400" />
					{myCity ? (
						<span>
							Repping <b className="text-white">{myCity.name}</b>
						</span>
					) : (
						<span className="text-white/60">
							You haven't joined a city yet.
						</span>
					)}
				</div>
				<GlassButton
					variant={myCity ? "outline" : "primary"}
					size="sm"
					onClick={onOpenPicker}
				>
					{myCity ? "Change city" : "Join your city"}
				</GlassButton>
			</GlassCardContent>
		</GlassCard>
	);
}

function CityRow({
	city,
	isMine,
}: {
	city: CityLeaderboardEntry;
	isMine: boolean;
}) {
	const medalColor = MEDAL_CLASS[city.rank];
	return (
		<Link
			to="/leaderboard/$citySlug"
			params={{ citySlug: city.slug }}
			className="block"
		>
			<div
				className={cn(
					"flex items-center gap-4 px-4 py-3 transition hover:bg-white/5",
					isMine && "rounded-xl bg-forest-500/15 ring-1 ring-forest-400/40",
				)}
			>
				<span
					className={cn(
						"flex w-8 shrink-0 items-center gap-1 font-semibold",
						medalColor ?? "text-white/50",
					)}
				>
					{medalColor && <Medal className="h-4 w-4" />}
					{city.rank}
				</span>
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium">
						{city.name}
						{isMine && (
							<span className="ml-2 text-xs text-forest-400">(your city)</span>
						)}
					</p>
					<p className="flex items-center gap-1 text-xs text-white/50">
						{countryFlag(city.country) && (
							<span>{countryFlag(city.country)}</span>
						)}
						{city.country} · <Users className="h-3 w-3" /> {city.memberCount}
					</p>
				</div>
				<GlassBadge variant="success">{city.points} pts</GlassBadge>
			</div>
		</Link>
	);
}

function CityPickerDialog({
	open,
	onOpenChange,
	cities,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	cities: CityLeaderboardEntry[];
}) {
	const queryClient = useQueryClient();
	const [error, setError] = useState<string | null>(null);

	const join = useMutation({
		mutationFn: (citySlug: string) =>
			fetchJson<UserCityResponse>("/api/user/city", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ citySlug }),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: userCityQueryKey() });
			queryClient.invalidateQueries({ queryKey: citiesQueryKey() });
			onOpenChange(false);
		},
		onError: (err) => {
			if (err instanceof ApiClientError && err.status === 429) {
				setError("Slow down — try again in a few seconds.");
				return;
			}
			setError("Couldn't join that city — try again.");
		},
	});

	function pick(slug: string) {
		setError(null);
		join.mutate(slug);
	}

	const us = cities.filter((c) => c.country === "USA");
	const global = cities.filter((c) => c.country !== "USA");

	return (
		<GlassDialog open={open} onOpenChange={onOpenChange}>
			<GlassDialogContent>
				<GlassDialogHeader>
					<GlassDialogTitle>Join your city</GlassDialogTitle>
					<GlassDialogDescription>
						Your quiz points add to your city's total. You can switch anytime.
					</GlassDialogDescription>
				</GlassDialogHeader>

				<div className="mt-4 max-h-80 overflow-y-auto pr-1">
					<CityGroup
						label="United States"
						cities={us}
						onPick={pick}
						pending={join.isPending}
					/>
					<CityGroup
						label="Global"
						cities={global}
						onPick={pick}
						pending={join.isPending}
					/>
				</div>

				{error && <p className="mt-3 text-sm text-red-400">{error}</p>}
			</GlassDialogContent>
		</GlassDialog>
	);
}

function CityGroup({
	label,
	cities,
	onPick,
	pending,
}: {
	label: string;
	cities: CityLeaderboardEntry[];
	onPick: (slug: string) => void;
	pending: boolean;
}) {
	if (cities.length === 0) return null;
	return (
		<div className="mb-3">
			<p className="mb-1 text-xs font-semibold text-white/40 uppercase tracking-wide">
				{label}
			</p>
			<div className="flex flex-col gap-1">
				{cities.map((city) => (
					<button
						key={city.slug}
						type="button"
						disabled={pending}
						onClick={() => onPick(city.slug)}
						className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-50"
					>
						<span>{city.name}</span>
						<span className="text-xs text-white/40">
							{countryFlag(city.country)} {city.country}
						</span>
					</button>
				))}
			</div>
		</div>
	);
}

function IndividualsLeaderboard() {
	const { data: session } = useSession();
	const { data, isLoading, error } = useLeaderboard(20);

	const meInTop =
		data?.entries.some((e) => e.userId === data.me?.userId) ?? false;

	return (
		<div>
			{!session && (
				<p className="mb-4 text-sm text-muted-foreground">
					<Link to="/login" className="text-forest-400 hover:underline">
						Sign in
					</Link>{" "}
					and take a{" "}
					<Link to="/quiz" className="text-forest-400 hover:underline">
						quiz
					</Link>{" "}
					to get on the board.
				</p>
			)}

			{isLoading && (
				<p className="text-muted-foreground">Loading leaderboard…</p>
			)}
			{error && (
				<p className="text-red-400">Couldn't load the leaderboard right now.</p>
			)}

			{data && (
				<GlassCard>
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

export function Row({
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
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium">
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
