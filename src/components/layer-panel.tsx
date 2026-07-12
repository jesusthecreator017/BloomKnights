import {
	BatteryCharging,
	Fish,
	Flame,
	Recycle,
	Trash2,
	Wind,
	X,
} from "lucide-react";
import { AskGeminiBox } from "#/components/ask-gemini-box";
import { GlassBadge } from "#/components/ui/glass-badge";
import {
	ENVIRONMENT_LAYERS,
	HEATMAP_LAYERS,
	type EnvironmentLayer,
} from "#/hooks/use-environment-layers";
import type {
	AirQualityResponse,
	AskGeminiRequest,
	CoralResponse,
	MarineLifeResponse,
	OceanResponse,
	PlaceKind,
	PlacesResponse,
	UvSolarResponse,
} from "#/lib/api-types";
import { aqiLevel, CORAL_DOT } from "#/lib/environment-format";
import { cn } from "#/lib/utils";
import { GlassTabs, GlassTabsList, GlassTabsTrigger } from "./ui/glass-tabs";

export const PLACE_KINDS: PlaceKind[] = ["recycling", "charging", "waste"];
export const PLACE_ICON: Record<PlaceKind, typeof Recycle> = {
	recycling: Recycle,
	charging: BatteryCharging,
	waste: Trash2,
};
export const PLACE_COLOR: Record<PlaceKind, string> = {
	recycling: "#3ebd49",
	charging: "#3d76d1",
	waste: "#f472b6",
};

interface LayerPanelProps {
	layer: EnvironmentLayer;
	onLayerChange: (layer: EnvironmentLayer) => void;
	placeKind: PlaceKind;
	onPlaceKindChange: (kind: PlaceKind) => void;
	heatmapEnabled: boolean;
	onHeatmapToggle: (enabled: boolean) => void;
	air?: AirQualityResponse;
	uvSolar?: UvSolarResponse;
	ocean?: OceanResponse;
	coral?: CoralResponse;
	places?: PlacesResponse;
	marineLife?: MarineLifeResponse;
	/** Address/name of the point currently being shown, when it's a click/search selection rather than the ambient map center. */
	title?: string;
	onClearSelection?: () => void;
	askContext: AskGeminiRequest["context"];
}

/** Condensed bottom-bar data panel + Ask Ecoverse AI, shared layout for Explorer. */
export function LayerPanel({
	layer,
	onLayerChange,
	placeKind,
	onPlaceKindChange,
	heatmapEnabled,
	onHeatmapToggle,
	air,
	uvSolar,
	ocean,
	coral,
	places,
	marineLife,
	title,
	onClearSelection,
	askContext,
}: LayerPanelProps) {
	const aqi = air?.current?.us_aqi;
	const aqiInfo = aqi != null ? aqiLevel(aqi) : null;
	const PlaceIcon = PLACE_ICON[placeKind];

	return (
		<div className="absolute bottom-4 left-4 z-10 flex max-w-[calc(100%-2rem)] flex-col">
			<GlassTabs
				value={layer}
				onValueChange={(v) => onLayerChange(v as EnvironmentLayer)}
				className="mb-3"
			>
				<GlassTabsList className="flex-wrap">
					{ENVIRONMENT_LAYERS.map((l) => (
						<GlassTabsTrigger key={l.id} value={l.id} className="text-xs">
							{l.label}
						</GlassTabsTrigger>
					))}
				</GlassTabsList>
			</GlassTabs>

			{HEATMAP_LAYERS.has(layer) && (
				<label className="mb-3 flex w-fit cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm text-white/80 shadow-lg backdrop-blur-xl">
					<input
						type="checkbox"
						checked={heatmapEnabled}
						onChange={(e) => onHeatmapToggle(e.target.checked)}
						className="h-4 w-4 rounded border-white/30 bg-transparent accent-forest-500"
					/>
					<Flame className="h-3.5 w-3.5 text-forest-400" /> Show heatmap
				</label>
			)}

			<div className="flex max-h-[42vh] w-[min(46rem,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl md:max-h-none md:flex-row md:overflow-visible">
				<div className="flex-1 md:w-72 md:shrink-0">
					{title && (
						<div className="mb-3 flex items-start justify-between gap-2 border-white/10 border-b pb-3">
							<p className="font-medium text-sm text-white leading-snug">
								{title}
							</p>
							{onClearSelection && (
								<button
									type="button"
									onClick={onClearSelection}
									className="shrink-0 rounded-full p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
									aria-label="Clear selection"
								>
									<X className="h-4 w-4" />
								</button>
							)}
						</div>
					)}

					{layer === "air-quality" && (
						<>
							<div className="flex items-center gap-2 text-sm text-white/70">
								<Wind className="h-4 w-4 text-navy-300" />
								Air quality {title ? "here" : "at map center"}
							</div>
							{aqi != null && aqiInfo ? (
								<div className="mt-1 flex items-baseline gap-2">
									<span className={`text-3xl font-bold ${aqiInfo.className}`}>
										{aqi}
									</span>
									<span className={`text-sm ${aqiInfo.className}`}>
										US AQI · {aqiInfo.label}
									</span>
								</div>
							) : (
								<div className="mt-1 text-sm text-white/50">Loading…</div>
							)}
							{air?.current && (
								<div className="mt-2 grid grid-cols-3 gap-3 text-xs text-white/60">
									<span>
										PM2.5 <b className="text-white">{air.current.pm2_5}</b>
									</span>
									<span>
										PM10 <b className="text-white">{air.current.pm10}</b>
									</span>
									<span>
										O₃ <b className="text-white">{air.current.ozone}</b>
									</span>
								</div>
							)}
						</>
					)}

					{layer === "uv-solar" && (
						<>
							<div className="text-sm text-white/70">UV & solar potential</div>
							{uvSolar?.current ? (
								<div className="mt-1 flex items-baseline gap-2">
									<span className="text-3xl font-bold text-forest-400">
										{uvSolar.current.uv_index}
									</span>
									<span className="text-sm text-white/60">UV Index now</span>
								</div>
							) : (
								<div className="mt-1 text-sm text-white/50">Loading…</div>
							)}
							{uvSolar?.daily && (
								<div className="mt-2 grid grid-cols-2 gap-2 text-xs text-white/60">
									<span>
										Peak UV today{" "}
										<b className="text-white">
											{uvSolar.daily.uv_index_max[0]}
										</b>
									</span>
									<span>
										Sunshine{" "}
										<b className="text-white">
											{(uvSolar.daily.sunshine_duration[0] / 3600).toFixed(1)}h
										</b>
									</span>
									<span className="col-span-2">
										Solar energy today{" "}
										<b className="text-white">
											{uvSolar.daily.shortwave_radiation_sum[0].toFixed(1)}{" "}
											MJ/m²
										</b>
									</span>
								</div>
							)}
						</>
					)}

					{layer === "ocean-coral" && (
						<>
							<div className="text-sm text-white/70">Ocean & reef status</div>
							{ocean?.current?.sea_surface_temperature != null ? (
								<div className="mt-1 flex items-baseline gap-2">
									<span className="text-3xl font-bold text-navy-300">
										{ocean.current.sea_surface_temperature}°C
									</span>
									<span className="text-sm text-white/60">
										Sea surface temp
									</span>
								</div>
							) : (
								<p className="mt-1 text-sm text-white/50">
									No ocean data here — try a coastal location.
								</p>
							)}
							{ocean?.current?.wave_height != null && (
								<div className="mt-2 grid grid-cols-2 gap-2 text-xs text-white/60">
									<span>
										Wave height{" "}
										<b className="text-white">{ocean.current.wave_height} m</b>
									</span>
									<span>
										Current{" "}
										<b className="text-white">
											{ocean.current.ocean_current_velocity} m/s
										</b>
									</span>
								</div>
							)}
							<div className="mt-3 border-white/10 border-t pt-3">
								{coral?.available ? (
									<div className="flex items-center gap-2 text-sm">
										<span
											className={cn(
												"h-2.5 w-2.5 rounded-full",
												CORAL_DOT[coral.alertArea] ?? "bg-white/40",
											)}
										/>
										Reef status:{" "}
										<span className="font-medium text-white">
											{coral.alertLabel}
										</span>
									</div>
								) : (
									<p className="text-xs text-white/50">
										{coral && !coral.available
											? coral.reason
											: "Checking nearest reef…"}
									</p>
								)}
							</div>
							{marineLife && (
								<div className="mt-3 border-white/10 border-t pt-3">
									<div className="flex items-center gap-2 text-sm text-white/70">
										<Fish className="h-4 w-4 text-navy-300" /> Marine life
										nearby
									</div>
									{marineLife.species.length === 0 ? (
										<p className="mt-1 text-xs text-white/50">
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
									)}
								</div>
							)}
						</>
					)}

					{layer === "places" && (
						<>
							<div className="flex items-center gap-2 text-sm text-white/70">
								<PlaceIcon
									className="h-4 w-4"
									style={{ color: PLACE_COLOR[placeKind] }}
								/>
								Nearby {placeKind}
							</div>
							<div className="mt-2 flex gap-1">
								{PLACE_KINDS.map((k) => (
									<button
										key={k}
										type="button"
										onClick={() => onPlaceKindChange(k)}
										className={cn(
											"rounded-full px-2.5 py-1 text-xs capitalize transition",
											placeKind === k
												? "bg-forest-500/30 text-forest-200"
												: "bg-white/10 text-white/60 hover:bg-white/15",
										)}
									>
										{k}
									</button>
								))}
							</div>
							<p className="mt-2 text-sm text-white/60">
								{places
									? `${places.count} found within 15km`
									: "Loading nearby places…"}
							</p>
						</>
					)}
				</div>

				<div className="md:w-72 md:shrink-0 md:border-white/10 md:border-l md:pl-4">
					<AskGeminiBox context={askContext} />
				</div>
			</div>
		</div>
	);
}
