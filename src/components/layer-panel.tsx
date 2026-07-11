import { BatteryCharging, Recycle, Trash2, Wind } from "lucide-react";
import {
	ENVIRONMENT_LAYERS,
	type EnvironmentLayer,
} from "#/hooks/use-environment-layers";
import type {
	AirQualityResponse,
	CoralResponse,
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
	air?: AirQualityResponse;
	uvSolar?: UvSolarResponse;
	ocean?: OceanResponse;
	coral?: CoralResponse;
	places?: PlacesResponse;
}

/** Ambient layer switcher + summary card for whatever point the map is centered on. Shared by Map and Explorer. */
export function LayerPanel({
	layer,
	onLayerChange,
	placeKind,
	onPlaceKindChange,
	air,
	uvSolar,
	ocean,
	coral,
	places,
}: LayerPanelProps) {
	const aqi = air?.current?.us_aqi;
	const aqiInfo = aqi != null ? aqiLevel(aqi) : null;
	const PlaceIcon = PLACE_ICON[placeKind];

	return (
		<div className="absolute top-4 left-4 z-10 max-w-[calc(100%-2rem)]">
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

			<div className="w-72 max-w-full rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
				{layer === "air-quality" && (
					<>
						<div className="flex items-center gap-2 text-sm text-white/70">
							<Wind className="h-4 w-4 text-navy-300" />
							Air quality at map center
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
									<b className="text-white">{uvSolar.daily.uv_index_max[0]}</b>
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
										{uvSolar.daily.shortwave_radiation_sum[0].toFixed(1)} MJ/m²
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
								<span className="text-sm text-white/60">Sea surface temp</span>
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
		</div>
	);
}
