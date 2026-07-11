import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Wind } from "lucide-react";
import { useState } from "react";
import { Map as MapGL, Marker, Popup } from "react-map-gl/maplibre";
import { GlassBadge } from "#/components/ui/glass-badge";
import type { EcoEvent } from "#/lib/events";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

interface AirQualityResponse {
	current?: {
		us_aqi: number;
		pm2_5: number;
		pm10: number;
		carbon_monoxide: number;
		nitrogen_dioxide: number;
		ozone: number;
	};
}

function aqiLevel(aqi: number): { label: string; className: string } {
	if (aqi <= 50) return { label: "Good", className: "text-forest-400" };
	if (aqi <= 100) return { label: "Moderate", className: "text-yellow-400" };
	if (aqi <= 150)
		return { label: "Unhealthy (sensitive)", className: "text-orange-400" };
	if (aqi <= 200) return { label: "Unhealthy", className: "text-red-400" };
	if (aqi <= 300)
		return { label: "Very Unhealthy", className: "text-purple-400" };
	return { label: "Hazardous", className: "text-rose-500" };
}

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

	const { data: events } = useQuery({
		queryKey: ["events"],
		queryFn: async (): Promise<Array<EcoEvent>> => {
			const res = await fetch("/api/events");
			if (!res.ok) throw new Error("Failed to load events");
			return res.json();
		},
	});

	// round so panning a few blocks doesn't refetch
	const aqiKey = {
		lat: Math.round(center.lat * 10) / 10,
		lng: Math.round(center.lng * 10) / 10,
	};
	const { data: air } = useQuery({
		queryKey: ["air-quality", aqiKey],
		queryFn: async (): Promise<AirQualityResponse> => {
			const res = await fetch(
				`/api/air-quality?lat=${aqiKey.lat}&lng=${aqiKey.lng}`,
			);
			if (!res.ok) throw new Error("Failed to load air quality");
			return res.json();
		},
		staleTime: 5 * 60 * 1000,
	});

	const aqi = air?.current?.us_aqi;
	const level = aqi != null ? aqiLevel(aqi) : null;

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

			{/* AQI glass overlay for the current map center */}
			<div className="absolute top-4 left-4 z-10 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
				<div className="flex items-center gap-2 text-sm text-white/70">
					<Wind className="h-4 w-4 text-navy-300" />
					Air quality at map center
				</div>
				{aqi != null && level ? (
					<div className="mt-1 flex items-baseline gap-2">
						<span className={`text-3xl font-bold ${level.className}`}>
							{aqi}
						</span>
						<span className={`text-sm ${level.className}`}>
							US AQI · {level.label}
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
			</div>
		</div>
	);
}
