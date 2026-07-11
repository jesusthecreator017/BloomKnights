import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, HandHeart, MapPin } from "lucide-react";
import { useState } from "react";
import { Map as MapGL, Marker } from "react-map-gl/maplibre";
import type { MapSelection } from "#/components/map-detail-dialog";
import { MapDetailDialog } from "#/components/map-detail-dialog";
import { fetchJson } from "#/lib/api-client";
import type { EcoInitiative, WeatherAlert } from "#/lib/api-types";
import type { EcoEvent } from "#/lib/events";
import { cn } from "#/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

type MapLayer = "events" | "initiatives" | "alerts";

const MAP_LAYERS: { id: MapLayer; label: string; dot: string }[] = [
	{ id: "events", label: "Events", dot: "bg-forest-400" },
	{ id: "initiatives", label: "Initiatives", dot: "bg-navy-300" },
	{ id: "alerts", label: "Climate Emergencies", dot: "bg-red-400" },
];

const categoryColors: Record<string, string> = {
	"clean-energy": "#3ebd49",
	cleanup: "#3d76d1",
	restoration: "#a3e635",
	transport: "#fbbf24",
	waste: "#f472b6",
	food: "#fb923c",
	advocacy: "#a78bfa",
	government: "#38bdf8",
	conservation: "#34d399",
};

const SEVERITY_COLOR: Record<string, string> = {
	Extreme: "#ef4444",
	Severe: "#f97316",
	Moderate: "#f59e0b",
	Minor: "#facc15",
};

export default function LiveMap() {
	const [selected, setSelected] = useState<MapSelection | null>(null);
	const [visibleLayers, setVisibleLayers] = useState<Set<MapLayer>>(
		new Set(["events", "initiatives", "alerts"]),
	);
	const [sidebarOpen, setSidebarOpen] = useState(true);

	const { data: events } = useQuery({
		queryKey: ["events"],
		queryFn: () => fetchJson<EcoEvent[]>("/api/events"),
	});

	const { data: initiatives } = useQuery({
		queryKey: ["initiatives"],
		queryFn: () => fetchJson<EcoInitiative[]>("/api/initiatives"),
	});

	const { data: alerts } = useQuery({
		queryKey: ["weather-alerts"],
		queryFn: () => fetchJson<WeatherAlert[]>("/api/weather-alerts"),
		staleTime: 5 * 60 * 1000,
	});

	function toggleLayer(id: MapLayer) {
		setVisibleLayers((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	return (
		<div className="relative h-full w-full">
			<MapGL
				initialViewState={{ latitude: 39.5, longitude: -98.35, zoom: 3.5 }}
				mapStyle={MAP_STYLE}
				style={{ width: "100%", height: "100%" }}
			>
				{visibleLayers.has("events") &&
					events?.map((event) => (
						<Marker
							key={event.id}
							latitude={event.lat}
							longitude={event.lng}
							onClick={(e) => {
								e.originalEvent.stopPropagation();
								setSelected({ kind: "event", data: event });
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

				{visibleLayers.has("initiatives") &&
					initiatives?.map((initiative) => (
						<Marker
							key={initiative.id}
							latitude={initiative.lat}
							longitude={initiative.lng}
							onClick={(e) => {
								e.originalEvent.stopPropagation();
								setSelected({ kind: "initiative", data: initiative });
							}}
						>
							<HandHeart
								className="h-6 w-6 -translate-y-1/2 cursor-pointer drop-shadow-lg"
								style={{
									color: categoryColors[initiative.category] ?? "#38bdf8",
								}}
								fill="currentColor"
								fillOpacity={0.2}
							/>
						</Marker>
					))}

				{visibleLayers.has("alerts") &&
					alerts?.map((alert) => (
						<Marker
							key={alert.id}
							latitude={alert.lat}
							longitude={alert.lng}
							onClick={(e) => {
								e.originalEvent.stopPropagation();
								setSelected({ kind: "alert", data: alert });
							}}
						>
							<AlertTriangle
								className="h-6 w-6 -translate-y-1/2 animate-pulse cursor-pointer drop-shadow-lg"
								style={{ color: SEVERITY_COLOR[alert.severity] ?? "#ef4444" }}
								fill="currentColor"
								fillOpacity={0.25}
							/>
						</Marker>
					))}
			</MapGL>

			<MapDetailDialog selection={selected} onClose={() => setSelected(null)} />

			{/* layer sidebar */}
			<div className="absolute top-4 left-4 z-10 max-w-[calc(100%-2rem)]">
				<button
					type="button"
					onClick={() => setSidebarOpen((v) => !v)}
					className="mb-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-white/70 text-xs shadow-lg backdrop-blur-xl transition hover:bg-white/15 hover:text-white"
				>
					{sidebarOpen ? "Hide layers" : "Show layers"}
				</button>

				{sidebarOpen && (
					<div className="w-64 max-w-full rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
						<p className="text-sm text-white/70">Map layers</p>
						<div className="mt-3 flex flex-col gap-2">
							{MAP_LAYERS.map((l) => (
								<label
									key={l.id}
									className="flex cursor-pointer items-center gap-2 text-sm text-white/80"
								>
									<input
										type="checkbox"
										checked={visibleLayers.has(l.id)}
										onChange={() => toggleLayer(l.id)}
										className="h-4 w-4 rounded border-white/30 bg-transparent accent-forest-500"
									/>
									<span
										className={cn("h-2.5 w-2.5 shrink-0 rounded-full", l.dot)}
									/>
									{l.label}
								</label>
							))}
						</div>
						<p className="mt-3 text-[11px] text-white/40">
							{events?.length ?? 0} events · {initiatives?.length ?? 0}{" "}
							initiatives · {alerts?.length ?? 0} active alerts
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
