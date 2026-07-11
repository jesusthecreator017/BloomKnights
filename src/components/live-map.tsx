import { useQuery } from "@tanstack/react-query";
import {
	BatteryCharging,
	CalendarDays,
	MapPin,
	Recycle,
	Trash2,
	Wind,
} from "lucide-react";
import { useState } from "react";
import { Map as MapGL, Marker, Popup } from "react-map-gl/maplibre";
import { GlassBadge } from "#/components/ui/glass-badge";
import {
	GlassTabs,
	GlassTabsList,
	GlassTabsTrigger,
} from "#/components/ui/glass-tabs";
import { fetchJson, roundCoord } from "#/lib/api-client";
import type {
	AirQualityResponse,
	CoralResponse,
	OceanResponse,
	PlaceKind,
	PlacesResponse,
	UvSolarResponse,
} from "#/lib/api-types";
import { aqiLevel, CORAL_DOT } from "#/lib/environment-format";
import type { EcoEvent } from "#/lib/events";
import { cn } from "#/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

type Layer = "air-quality" | "uv-solar" | "ocean-coral" | "places";

const LAYERS: { id: Layer; label: string }[] = [
	{ id: "air-quality", label: "Air Quality" },
	{ id: "uv-solar", label: "UV & Solar" },
	{ id: "ocean-coral", label: "Ocean & Reef" },
	{ id: "places", label: "Places" },
];

const PLACE_KINDS: PlaceKind[] = ["recycling", "charging", "waste"];
const PLACE_ICON: Record<PlaceKind, typeof Recycle> = {
	recycling: Recycle,
	charging: BatteryCharging,
	waste: Trash2,
};
const PLACE_COLOR: Record<PlaceKind, string> = {
	recycling: "#3ebd49",
	charging: "#3d76d1",
	waste: "#f472b6",
};

const categoryColors: Record<string, string> = {
	"clean-energy": "#3ebd49",
	cleanup: "#3d76d1",
	restoration: "#a3e635",
	transport: "#fbbf24",
	waste: "#f472b6",
	food: "#fb923c",
};

export default function LiveMap() {
	const [selected, setSelected] = useState<EcoEvent | null>(null);
	const [center, setCenter] = useState({ lat: 39.5, lng: -98.35 });
	const [layer, setLayer] = useState<Layer>("air-quality");
	const [placeKind, setPlaceKind] = useState<PlaceKind>("recycling");

	// round so panning a few blocks doesn't refetch
	const key = { lat: roundCoord(center.lat), lng: roundCoord(center.lng) };
	const q = `lat=${key.lat}&lng=${key.lng}`;

	const { data: events } = useQuery({
		queryKey: ["events"],
		queryFn: () => fetchJson<EcoEvent[]>("/api/events"),
	});

	const { data: air } = useQuery({
		queryKey: ["air-quality", key],
		queryFn: () => fetchJson<AirQualityResponse>(`/api/air-quality?${q}`),
		enabled: layer === "air-quality",
		staleTime: 5 * 60 * 1000,
	});

	const { data: uvSolar } = useQuery({
		queryKey: ["uv-solar", key],
		queryFn: () => fetchJson<UvSolarResponse>(`/api/uv-solar?${q}`),
		enabled: layer === "uv-solar",
		staleTime: 5 * 60 * 1000,
	});

	const { data: ocean } = useQuery({
		queryKey: ["ocean", key],
		queryFn: () => fetchJson<OceanResponse>(`/api/ocean?${q}`),
		enabled: layer === "ocean-coral",
		staleTime: 5 * 60 * 1000,
	});

	const { data: coral } = useQuery({
		queryKey: ["coral", key],
		queryFn: () => fetchJson<CoralResponse>(`/api/coral?${q}`),
		enabled: layer === "ocean-coral",
		staleTime: 5 * 60 * 1000,
	});

	const { data: places } = useQuery({
		queryKey: ["places", key, placeKind],
		queryFn: () =>
			fetchJson<PlacesResponse>(`/api/places?${q}&kind=${placeKind}`),
		enabled: layer === "places",
		staleTime: 5 * 60 * 1000,
	});

	const aqi = air?.current?.us_aqi;
	const aqiInfo = aqi != null ? aqiLevel(aqi) : null;
	const PlaceIcon = PLACE_ICON[placeKind];

	return (
		<div className="relative h-full w-full">
			<MapGL
				initialViewState={{ latitude: 39.5, longitude: -98.35, zoom: 3.5 }}
				mapStyle={MAP_STYLE}
				style={{ width: "100%", height: "100%" }}
				onMoveEnd={(e) =>
					setCenter({
						lat: e.viewState.latitude,
						lng: e.viewState.longitude,
					})
				}
			>
				{events?.map((event) => (
					<Marker
						key={event.id}
						latitude={event.lat}
						longitude={event.lng}
						onClick={(e) => {
							e.originalEvent.stopPropagation();
							setSelected(event);
						}}
					>
						<MapPin
							className="h-7 w-7 -translate-y-1/2 cursor-pointer drop-shadow-lg"
							style={{ color: categoryColors[event.category] ?? "#3ebd49" }}
							fill="currentColor"
							fillOpacity={0.25}
						/>
					</Marker>
				))}

				{layer === "places" &&
					places?.places.map((place) => (
						<Marker key={place.id} latitude={place.lat} longitude={place.lng}>
							<PlaceIcon
								className="h-5 w-5 -translate-y-1/2 drop-shadow-lg"
								style={{ color: PLACE_COLOR[placeKind] }}
							/>
						</Marker>
					))}

				{selected && (
					<Popup
						latitude={selected.lat}
						longitude={selected.lng}
						anchor="bottom"
						offset={18}
						onClose={() => setSelected(null)}
						closeButton={false}
						className="eco-popup"
						maxWidth="320px"
					>
						<div className="rounded-xl p-1 text-left">
							<div className="flex items-center gap-2">
								<GlassBadge>{selected.category}</GlassBadge>
								<span className="flex items-center gap-1 text-xs text-white/60">
									<CalendarDays className="h-3 w-3" />
									{selected.date}
								</span>
							</div>
							<h3 className="mt-2 font-semibold text-white">{selected.name}</h3>
							<p className="mt-1 text-sm text-white/70">
								{selected.description}
							</p>
							<div className="mt-2 flex items-center justify-between text-xs">
								<span className="text-white/50">{selected.city}</span>
								<a
									href={selected.url}
									target="_blank"
									rel="noreferrer"
									className="font-medium text-forest-400 hover:underline"
								>
									Learn more →
								</a>
							</div>
						</div>
					</Popup>
				)}
			</MapGL>

			{/* layer switcher */}
			<div className="absolute top-4 left-4 z-10 max-w-[calc(100%-2rem)]">
				<GlassTabs
					value={layer}
					onValueChange={(v) => setLayer(v as Layer)}
					className="mb-3"
				>
					<GlassTabsList className="flex-wrap">
						{LAYERS.map((l) => (
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
										onClick={() => setPlaceKind(k)}
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
		</div>
	);
}
