import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	BarChart3,
	ChevronLeft,
	ChevronRight,
	ExternalLink,
	Flame,
	Recycle,
	Trees,
	Utensils,
	Waves,
	Wind,
	Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { AqiByCityChart } from "#/components/charts/aqi-by-city-chart";
import { EmissionsBarChart } from "#/components/charts/emissions-bar-chart";
import { EmissionsDonut } from "#/components/charts/emissions-donut";
import { GlassBadge } from "#/components/ui/glass-badge";
import {
	GlassCard,
	GlassCardContent,
	GlassCardHeader,
	GlassCardTitle,
} from "#/components/ui/glass-card";
import { useCityScores } from "#/hooks/use-cities";
import { fetchJson } from "#/lib/api-client";
import type { EmissionsResponse } from "#/lib/api-types";
import { EMISSIONS_COUNTRIES, flagEmoji } from "#/lib/country";
import {
	CATEGORIES,
	type Resource,
	type ResourceCategory,
	type ResourceType,
	resourcesByCategory,
} from "#/lib/resources";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/resources")({
	component: ResourcesPage,
});

const CATEGORY_ICON: Record<ResourceCategory, typeof Flame> = {
	carbon: Flame,
	energy: Zap,
	ocean: Waves,
	waste: Recycle,
	biodiversity: Trees,
	food: Utensils,
	"air-quality": Wind,
};

const TYPE_BADGE: Record<
	ResourceType,
	"success" | "primary" | "default" | "outline"
> = {
	action: "success",
	article: "primary",
	org: "default",
	data: "outline",
};

const TYPE_LABEL: Record<ResourceType, string> = {
	action: "Action",
	article: "Article",
	org: "Org",
	data: "Data",
};

const PAGE_SIZE = 9;

function ResourcesPage() {
	const [category, setCategory] = useState<ResourceCategory | "all">("all");
	const [page, setPage] = useState(1);
	const filtered = resourcesByCategory(category);
	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	function selectCategory(next: ResourceCategory | "all") {
		setCategory(next);
		setPage(1);
	}

	return (
		<div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
			<h1 className="text-3xl font-bold">Be part of the solution</h1>
			<p className="mt-2 max-w-2xl text-muted-foreground">
				Actions you can take today, plus real orgs, data, and reading to
				understand the why. Browse by category, or find an event near you on the
				map.
			</p>

			<div className="mt-6 flex flex-wrap gap-2">
				<CategoryPill
					active={category === "all"}
					onClick={() => selectCategory("all")}
				>
					All
				</CategoryPill>
				{CATEGORIES.map((c) => {
					const Icon = CATEGORY_ICON[c.id];
					return (
						<CategoryPill
							key={c.id}
							active={category === c.id}
							onClick={() => selectCategory(c.id)}
						>
							<Icon className="h-3.5 w-3.5" /> {c.label}
						</CategoryPill>
					);
				})}
			</div>

			<div className="mt-8 grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{visible.map((resource) => (
					<ResourceCard key={resource.id} resource={resource} />
				))}
			</div>

			{filtered.length > PAGE_SIZE && (
				<div className="mt-8 flex items-center justify-center gap-4">
					<button
						type="button"
						onClick={() => setPage((p) => Math.max(1, p - 1))}
						disabled={page === 1}
						className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white/90 disabled:pointer-events-none disabled:opacity-30"
					>
						<ChevronLeft className="h-4 w-4" /> Prev
					</button>
					<span className="text-sm text-white/50">
						Page {page} of {totalPages}
					</span>
					<button
						type="button"
						onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
						disabled={page === totalPages}
						className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white/90 disabled:pointer-events-none disabled:opacity-30"
					>
						Next <ChevronRight className="h-4 w-4" />
					</button>
				</div>
			)}

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

function CategoryPill({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition",
				active
					? "border-forest-400/40 bg-forest-500/25 text-forest-100"
					: "border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80",
			)}
		>
			{children}
		</button>
	);
}

function ResourceCard({ resource }: { resource: Resource }) {
	return (
		<GlassCard glowEffect={false} className="flex h-full flex-col">
			<GlassCardHeader>
				<GlassBadge variant={TYPE_BADGE[resource.type]} className="w-fit">
					{TYPE_LABEL[resource.type]}
				</GlassBadge>
				<GlassCardTitle className="mt-2">{resource.title}</GlassCardTitle>
				{resource.impact && (
					<span className="text-forest-400 text-xs">{resource.impact}</span>
				)}
			</GlassCardHeader>
			<GlassCardContent className="flex flex-1 flex-col">
				<p className="flex-1 text-sm text-white/60">{resource.description}</p>
				{resource.url === "/map" ? (
					<Link
						to="/map"
						className="mt-3 flex items-center gap-1 text-forest-400 text-xs hover:underline"
					>
						Find one near you <ArrowRight className="h-3 w-3" />
					</Link>
				) : (
					<a
						href={resource.url}
						target="_blank"
						rel="noreferrer"
						className="mt-3 flex items-center gap-1 text-forest-400 text-xs hover:underline"
					>
						Learn more <ExternalLink className="h-3 w-3" />
					</a>
				)}
			</GlassCardContent>
		</GlassCard>
	);
}

function EmissionsSection() {
	const [country, setCountry] = useState("USA");
	const selected = EMISSIONS_COUNTRIES.find((c) => c.iso3 === country);

	const { data, isLoading, error } = useQuery({
		queryKey: ["emissions", country],
		queryFn: () =>
			fetchJson<EmissionsResponse>(`/api/emissions?country=${country}`),
	});
	const cityScores = useCityScores();

	const entry = data?.data?.[0];

	return (
		<div className="mt-20">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-2">
					<BarChart3 className="h-6 w-6 text-forest-400" />
					<h2 className="text-2xl font-bold">Global Emissions</h2>
				</div>
				<select
					value={country}
					onChange={(e) => setCountry(e.target.value)}
					className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-foreground shadow-lg backdrop-blur-xl outline-none transition hover:bg-white/15"
				>
					{EMISSIONS_COUNTRIES.map((c) => (
						<option key={c.iso3} value={c.iso3} className="bg-slate-900">
							{flagEmoji(c.iso2)} {c.name}
						</option>
					))}
				</select>
			</div>
			<p className="mt-2 max-w-2xl text-muted-foreground">
				Country-level carbon data from Climate TRACE — compare any country's
				share of the world's warming against the rest of Earth.
			</p>

			{isLoading && (
				<p className="mt-8 text-muted-foreground">Loading emissions data…</p>
			)}
			{error && (
				<p className="mt-8 text-red-400">
					Couldn't load emissions data. Try again shortly.
				</p>
			)}

			{entry && selected && (
				<div className="mt-8 grid gap-6 lg:grid-cols-2">
					<EmissionsBarChart entry={entry} countryName={selected.name} />
					<EmissionsDonut entry={entry} />
				</div>
			)}

			{entry && (
				<p className="mt-4 text-sm text-white/50">
					{selected?.name ?? country} is responsible for about{" "}
					{(
						(entry.emissions.co2e_100yr / entry.worldEmissions.co2e_100yr) *
						100
					).toFixed(1)}
					% of tracked global CO2e emissions — ranked #{entry.rank}.{" "}
					<a
						href="https://climatetrace.org"
						target="_blank"
						rel="noreferrer"
						className="text-forest-400 hover:underline"
					>
						Source: Climate TRACE
					</a>
				</p>
			)}

			<div className="mt-8">
				{cityScores.isLoading && (
					<p className="text-muted-foreground">Loading live air quality…</p>
				)}
				{cityScores.error && (
					<p className="text-red-400">
						Couldn't load live environmental scores right now.
					</p>
				)}
				{cityScores.data && <AqiByCityChart scores={cityScores.data.scores} />}
			</div>
		</div>
	);
}
