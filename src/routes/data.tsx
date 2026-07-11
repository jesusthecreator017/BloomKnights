import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
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

export const Route = createFileRoute("/data")({ component: DataPage });

function DataPage() {
	const { data, isLoading, error } = useQuery({
		queryKey: ["emissions", "USA"],
		queryFn: () => fetchJson<EmissionsResponse>("/api/emissions?country=USA"),
	});

	const entry = data?.data?.[0];

	return (
		<div className="mx-auto max-w-4xl px-4 py-16">
			<div className="flex items-center gap-2">
				<BarChart3 className="h-6 w-6 text-forest-400" />
				<h1 className="text-3xl font-bold">Global Emissions</h1>
			</div>
			<p className="mt-2 max-w-2xl text-white/70">
				Country-level carbon data from Climate TRACE — how much of the world's
				warming comes from one country.
			</p>

			{isLoading && (
				<p className="mt-8 text-white/50">Loading emissions data…</p>
			)}
			{error && (
				<p className="mt-8 text-red-300">
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
