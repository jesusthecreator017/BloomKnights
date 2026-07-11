import { useQuery } from "@tanstack/react-query";
import { Fish, Recycle, Sun, Waves, Wind, X } from "lucide-react";
import { AskGeminiBox } from "#/components/ask-gemini-box";
import { GlassBadge } from "#/components/ui/glass-badge";
import {
	GlassCard,
	GlassCardContent,
	GlassCardHeader,
	GlassCardTitle,
} from "#/components/ui/glass-card";
import { fetchJson } from "#/lib/api-client";
import type {
	AirQualityResponse,
	CoralResponse,
	MarineLifeResponse,
	OceanResponse,
	PlacesResponse,
	UvSolarResponse,
} from "#/lib/api-types";
import { aqiLevel, CORAL_DOT } from "#/lib/environment-format";
import { cn } from "#/lib/utils";

interface LocationDetailPanelProps {
	lat: number;
	lng: number;
	address?: string;
	onClose: () => void;
}

export function LocationDetailPanel({
	lat,
	lng,
	address,
	onClose,
}: LocationDetailPanelProps) {
	const q = `lat=${lat}&lng=${lng}`;

	const { data: air } = useQuery({
		queryKey: ["air-quality", lat, lng],
		queryFn: () => fetchJson<AirQualityResponse>(`/api/air-quality?${q}`),
	});
	const { data: uvSolar } = useQuery({
		queryKey: ["uv-solar", lat, lng],
		queryFn: () => fetchJson<UvSolarResponse>(`/api/uv-solar?${q}`),
	});
	const { data: ocean } = useQuery({
		queryKey: ["ocean", lat, lng],
		queryFn: () => fetchJson<OceanResponse>(`/api/ocean?${q}`),
	});
	const { data: coral } = useQuery({
		queryKey: ["coral", lat, lng],
		queryFn: () => fetchJson<CoralResponse>(`/api/coral?${q}`),
	});
	const { data: marineLife } = useQuery({
		queryKey: ["marine-life", lat, lng],
		queryFn: () => fetchJson<MarineLifeResponse>(`/api/marine-life?${q}`),
	});
	const { data: recycling } = useQuery({
		queryKey: ["places", lat, lng, "recycling"],
		queryFn: () => fetchJson<PlacesResponse>(`/api/places?${q}&kind=recycling`),
	});

	const aqi = air?.current?.us_aqi;
	const aqiInfo = aqi != null ? aqiLevel(aqi) : null;

	return (
		<div className="absolute top-4 right-4 z-10 flex max-h-[calc(100%-2rem)] w-[min(22rem,calc(100%-2rem))] flex-col gap-3 overflow-y-auto pb-2">
			<GlassCard glowEffect={false}>
				<GlassCardHeader className="flex-row items-start justify-between gap-2 space-y-0">
					<GlassCardTitle className="text-sm leading-snug">
						{address ?? "Selected location"}
					</GlassCardTitle>
					<button
						type="button"
						onClick={onClose}
						className="shrink-0 rounded-full p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
						aria-label="Close location details"
					>
						<X className="h-4 w-4" />
					</button>
				</GlassCardHeader>
			</GlassCard>

			<GlassCard glowEffect={false}>
				<GlassCardContent className="pt-6">
					<div className="flex items-center gap-2 text-sm text-white/70">
						<Wind className="h-4 w-4 text-navy-300" /> Air quality
					</div>
					{aqi != null && aqiInfo ? (
						<div className="mt-1 flex items-baseline gap-2">
							<span className={`text-2xl font-bold ${aqiInfo.className}`}>
								{aqi}
							</span>
							<span className={`text-sm ${aqiInfo.className}`}>
								{aqiInfo.label}
							</span>
						</div>
					) : (
						<p className="mt-1 text-sm text-white/50">Loading…</p>
					)}
				</GlassCardContent>
			</GlassCard>

			<GlassCard glowEffect={false}>
				<GlassCardContent className="pt-6">
					<div className="flex items-center gap-2 text-sm text-white/70">
						<Sun className="h-4 w-4 text-forest-400" /> UV & solar potential
					</div>
					{uvSolar?.current ? (
						<div className="mt-1 flex items-baseline gap-2">
							<span className="text-2xl font-bold text-forest-400">
								{uvSolar.current.uv_index}
							</span>
							<span className="text-sm text-white/60">
								UV index · {uvSolar.current.shortwave_radiation} W/m² now
							</span>
						</div>
					) : (
						<p className="mt-1 text-sm text-white/50">Loading…</p>
					)}
				</GlassCardContent>
			</GlassCard>

			<GlassCard glowEffect={false}>
				<GlassCardContent className="pt-6">
					<div className="flex items-center gap-2 text-sm text-white/70">
						<Waves className="h-4 w-4 text-navy-300" /> Ocean & reef
					</div>
					{ocean?.current?.sea_surface_temperature != null ? (
						<p className="mt-1 text-sm text-white/70">
							Sea surface temp{" "}
							<b className="text-white">
								{ocean.current.sea_surface_temperature}°C
							</b>
						</p>
					) : (
						<p className="mt-1 text-sm text-white/50">
							No ocean data here (inland).
						</p>
					)}
					{coral?.available ? (
						<div className="mt-2 flex items-center gap-2 text-sm">
							<span
								className={cn(
									"h-2.5 w-2.5 rounded-full",
									CORAL_DOT[coral.alertArea] ?? "bg-white/40",
								)}
							/>
							Reef:{" "}
							<span className="font-medium text-white">{coral.alertLabel}</span>
						</div>
					) : coral && !coral.available ? (
						<p className="mt-2 text-xs text-white/50">{coral.reason}</p>
					) : null}
				</GlassCardContent>
			</GlassCard>

			<GlassCard glowEffect={false}>
				<GlassCardContent className="pt-6">
					<div className="flex items-center gap-2 text-sm text-white/70">
						<Fish className="h-4 w-4 text-navy-300" /> Marine life nearby
					</div>
					{marineLife ? (
						marineLife.species.length === 0 ? (
							<p className="mt-1 text-sm text-white/50">
								No recorded sightings nearby.
							</p>
						) : (
							<div className="mt-2 flex flex-wrap gap-1">
								{marineLife.species.slice(0, 5).map((s) => (
									<GlassBadge
										key={s.name}
										variant="outline"
										className="text-xs"
									>
										{s.common && s.common !== "NA" ? s.common : s.name} ·{" "}
										{s.count}
									</GlassBadge>
								))}
							</div>
						)
					) : (
						<p className="mt-1 text-sm text-white/50">Loading…</p>
					)}
				</GlassCardContent>
			</GlassCard>

			<GlassCard glowEffect={false}>
				<GlassCardContent className="pt-6">
					<div className="flex items-center gap-2 text-sm text-white/70">
						<Recycle className="h-4 w-4 text-forest-400" /> Nearby recycling
					</div>
					{recycling ? (
						<p className="mt-1 text-sm text-white/70">
							{recycling.count} facilities within 15km
						</p>
					) : (
						<p className="mt-1 text-sm text-white/50">Loading…</p>
					)}
				</GlassCardContent>
			</GlassCard>

			<GlassCard glowEffect={false}>
				<GlassCardContent className="pt-6">
					<AskGeminiBox
						context={{
							kind: "location",
							name: address,
							lat,
							lng,
							liveData:
								aqi != null && aqiInfo
									? `AQI ${aqi} (${aqiInfo.label})${uvSolar?.current ? `, UV index ${uvSolar.current.uv_index}` : ""}`
									: undefined,
						}}
					/>
				</GlassCardContent>
			</GlassCard>
		</div>
	);
}
