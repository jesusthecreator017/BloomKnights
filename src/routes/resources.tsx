import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3 } from "lucide-react";
import { GlassBadge } from "#/components/ui/glass-badge";
import {
	GlassCard,
	GlassCardContent,
	GlassCardDescription,
	GlassCardHeader,
	GlassCardTitle,
} from "#/components/ui/glass-card";
import { fetchJson } from "#/lib/api-client";
import type { EmissionsResponse } from "#/lib/api-types";
import { formatTonnesCo2e } from "#/lib/format";

export const Route = createFileRoute("/resources")({
	component: ResourcesPage,
});

const actions = [
	{
		title: "Join community solar",
		impact: "Up to 1.5 tons CO2/yr",
		effort: "Easy",
		description:
			"No rooftop needed — subscribe to a shared solar farm and clean up your electricity in about 20 minutes.",
	},
	{
		title: "Swap one car trip a day",
		impact: "~1 ton CO2/yr",
		effort: "Easy",
		description:
			"Bike, walk, or take transit for your shortest daily trip. Short cold-engine drives are the least efficient ones.",
	},
	{
		title: "Switch to a heat pump",
		impact: "2–4 tons CO2/yr",
		effort: "Project",
		description:
			"Heating is most homes' biggest energy use. Federal rebates can cover thousands of dollars of the cost.",
	},
	{
		title: "Eat plant-forward twice a week",
		impact: "~0.5 ton CO2/yr",
		effort: "Easy",
		description:
			"Beef has ~10x the footprint of chicken and ~30x that of beans. Two swapped dinners a week adds up fast.",
	},
	{
		title: "Repair instead of replace",
		impact: "Less landfill + embodied carbon",
		effort: "Medium",
		description:
			"Most of a gadget's footprint happens before you ever turn it on. Repair cafés make fixing free and social.",
	},
	{
		title: "Show up locally",
		impact: "Multiplies everything",
		effort: "Easy",
		description:
			"Cleanups, tree plantings, and co-op info nights near you are on the map. Bring a friend — action is contagious.",
	},
] as const;

function ResourcesPage() {
	return (
		<div className="mx-auto max-w-6xl px-4 py-16">
			<h1 className="text-3xl font-bold">Be part of the solution</h1>
			<p className="mt-2 max-w-2xl text-muted-foreground">
				Small changes, done by many people, move the grid. Start with one of
				these — then find an event near you on the map.
			</p>

			<div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{actions.map((action) => (
					<GlassCard key={action.title} glowEffect={false}>
						<GlassCardHeader>
							<div className="flex items-center gap-2">
								<GlassBadge>{action.effort}</GlassBadge>
								<span className="text-xs text-forest-400">{action.impact}</span>
							</div>
							<GlassCardTitle className="mt-1">{action.title}</GlassCardTitle>
						</GlassCardHeader>
						<GlassCardContent>
							<p className="text-sm text-white/60">{action.description}</p>
						</GlassCardContent>
					</GlassCard>
				))}
			</div>

			<div className="mt-10">
				<Link
					to="/map"
					className="inline-flex items-center gap-2 font-medium text-forest-400 hover:underline"
				>
					Find an event near you <ArrowRight className="h-4 w-4" />
				</Link>
			</div>

			<EmissionsSection />
		</div>
	);
}

function EmissionsSection() {
	const { data, isLoading, error } = useQuery({
		queryKey: ["emissions", "USA"],
		queryFn: () => fetchJson<EmissionsResponse>("/api/emissions?country=USA"),
	});

	const entry = data?.data?.[0];

	return (
		<div className="mt-20">
			<div className="flex items-center gap-2">
				<BarChart3 className="h-6 w-6 text-forest-400" />
				<h2 className="text-2xl font-bold">Global Emissions</h2>
			</div>
			<p className="mt-2 max-w-2xl text-muted-foreground">
				Country-level carbon data from Climate TRACE — how much of the world's
				warming comes from one country.
			</p>

			{isLoading && (
				<p className="mt-8 text-muted-foreground">Loading emissions data…</p>
			)}
			{error && (
				<p className="mt-8 text-red-400">
					Couldn't load emissions data. Try again shortly.
				</p>
			)}

			{entry && (
				<div className="mt-8 flex flex-col gap-6">
					<GlassCard>
						<GlassCardHeader>
							<GlassCardTitle>USA vs. the world</GlassCardTitle>
							<GlassCardDescription>
								Annual CO2-equivalent emissions (100-year basis)
							</GlassCardDescription>
						</GlassCardHeader>
						<GlassCardContent className="flex flex-col gap-5">
							<EmissionsBar
								label="United States"
								value={entry.emissions.co2e_100yr}
								max={entry.worldEmissions.co2e_100yr}
								colorClass="from-forest-400 to-forest-600"
							/>
							<EmissionsBar
								label="Rest of world"
								value={
									entry.worldEmissions.co2e_100yr - entry.emissions.co2e_100yr
								}
								max={entry.worldEmissions.co2e_100yr}
								colorClass="from-navy-400 to-navy-600"
							/>
							<p className="text-sm text-white/50">
								The USA is responsible for about{" "}
								{(
									(entry.emissions.co2e_100yr /
										entry.worldEmissions.co2e_100yr) *
									100
								).toFixed(1)}
								% of tracked global CO2e emissions — ranked #{entry.rank}.
							</p>
						</GlassCardContent>
					</GlassCard>

					<div className="grid gap-4 sm:grid-cols-3">
						<StatCard
							label="CO2"
							value={formatTonnesCo2e(entry.emissions.co2)}
						/>
						<StatCard
							label="Methane (CH4)"
							value={formatTonnesCo2e(entry.emissions.ch4)}
						/>
						<StatCard
							label="Nitrous oxide (N2O)"
							value={formatTonnesCo2e(entry.emissions.n2o)}
						/>
					</div>
				</div>
			)}
		</div>
	);
}

function EmissionsBar({
	label,
	value,
	max,
	colorClass,
}: {
	label: string;
	value: number;
	max: number;
	colorClass: string;
}) {
	const pct = Math.min(100, (value / max) * 100);
	return (
		<div>
			<div className="mb-2 flex items-baseline justify-between text-sm">
				<span className="text-white/80">{label}</span>
				<span className="text-white/50">{formatTonnesCo2e(value)}</span>
			</div>
			<div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
				<div
					className={`h-full rounded-full bg-gradient-to-r ${colorClass}`}
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}

function StatCard({ label, value }: { label: string; value: string }) {
	return (
		<GlassCard glowEffect={false}>
			<GlassCardContent className="pt-6">
				<p className="text-2xl font-semibold">{value}</p>
				<p className="mt-1 text-sm text-white/60">{label}</p>
			</GlassCardContent>
		</GlassCard>
	);
}
