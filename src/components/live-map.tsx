import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, HandHeart, MapPin, Search } from "lucide-react";
import type { LngLatBounds } from "maplibre-gl";
import { useRef, useState } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import { Map as MapGL, Marker } from "react-map-gl/maplibre";
import type { MapSelection } from "#/components/map-detail-dialog";
import { MapDetailDialog } from "#/components/map-detail-dialog";
import { GlassInput } from "#/components/ui/glass-input";
import { ApiClientError, fetchJson, roundCoord } from "#/lib/api-client";
import type {
	EcoInitiative,
	PlaceAutocompleteResponse,
	PlaceDetailsResponse,
	PlaceSuggestion,
	WeatherAlert,
} from "#/lib/api-types";
import type { EcoEvent } from "#/lib/events";
import { cn } from "#/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";
const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 };

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
	nonprofit: "#a78bfa",
	organization: "#38bdf8",
};

const SEVERITY_COLOR: Record<string, string> = {
	Extreme: "#ef4444",
	Severe: "#f97316",
	Moderate: "#f59e0b",
	Minor: "#facc15",
};

/**
 * Spreads out markers that land on (near-)identical coordinates into a small
 * ring so co-located live results are readable instead of stacked into one pin.
 * Purely a render-time transform — never mutates the fetched data.
 */
function declutter<T extends { lat: number; lng: number }>(items: T[]): T[] {
	const groups = new Map<string, T[]>();
	for (const item of items) {
		const key = `${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
		const group = groups.get(key);
		if (group) group.push(item);
		else groups.set(key, [item]);
	}

	const out: T[] = [];
	for (const group of groups.values()) {
		if (group.length === 1) {
			out.push(group[0]);
			continue;
		}
		const radiusDeg = 0.015; // ~1.5km spread at the equator
		for (const [i, item] of group.entries()) {
			const angle = (2 * Math.PI * i) / group.length;
			const latOffset = radiusDeg * Math.sin(angle);
			const lngOffset =
				(radiusDeg * Math.cos(angle)) /
				Math.cos((item.lat * Math.PI) / 180 || 1);
			out.push({
				...item,
				lat: item.lat + latOffset,
				lng: item.lng + lngOffset,
			});
		}
	}
	return out;
}

export default function LiveMap() {
	const [selected, setSelected] = useState<MapSelection | null>(null);
	const [visibleLayers, setVisibleLayers] = useState<Set<MapLayer>>(
		new Set(["events", "initiatives", "alerts"]),
	);
	// rendered inside ClientOnly, so window is safe; phones start collapsed
	const [sidebarOpen, setSidebarOpen] = useState(
		() =>
			typeof window === "undefined" ||
			window.matchMedia("(min-width: 768px)").matches,
	);
	const mapRef = useRef<MapRef | null>(null);
	const [bounds, setBounds] = useState<LngLatBounds | null>(null);
	const [dataCenter, setDataCenter] = useState(DEFAULT_CENTER);

	const [query, setQuery] = useState("");
	const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	function syncBounds() {
		const map = mapRef.current?.getMap();
		const b = map?.getBounds();
		if (b) setBounds(b);
		const center = map?.getCenter();
		if (center) {
			setDataCenter({
				lat: roundCoord(center.lat),
				lng: roundCoord(center.lng),
			});
		}
	}

	const {
		data: events,
		isLoading: eventsLoading,
		isFetching: eventsFetching,
	} = useQuery({
		queryKey: ["events", dataCenter],
		queryFn: () =>
			fetchJson<EcoEvent[]>(
				`/api/events?lat=${dataCenter.lat}&lng=${dataCenter.lng}`,
			),
		staleTime: 5 * 60_000,
		retry: (count) => count < 2,
	});

	const { data: initiatives, isFetching: initiativesFetching } = useQuery({
		queryKey: ["initiatives", dataCenter],
		queryFn: () =>
			fetchJson<EcoInitiative[]>(
				`/api/initiatives?lat=${dataCenter.lat}&lng=${dataCenter.lng}`,
			),
		staleTime: 5 * 60_000,
		retry: (count) => count < 2,
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

	function handleQueryChange(value: string) {
		setQuery(value);
		setShowSuggestions(true);
		if (debounceRef.current) clearTimeout(debounceRef.current);

		if (value.trim().length < 3) {
			setSuggestions([]);
			setSearchError(null);
			return;
		}

		debounceRef.current = setTimeout(async () => {
			try {
				const res = await fetchJson<PlaceAutocompleteResponse>(
					`/api/geocode/autocomplete?input=${encodeURIComponent(value)}`,
				);
				setSuggestions(res.suggestions);
				setSearchError(null);
			} catch (err) {
				setSuggestions([]);
				setSearchError(
					err instanceof ApiClientError && err.status === 500
						? "Area search isn't configured yet."
						: "Search isn't available right now.",
				);
			}
		}, 300);
	}

	async function handleSelectSuggestion(placeId: string, text: string) {
		setShowSuggestions(false);
		setQuery(text);
		try {
			const place = await fetchJson<PlaceDetailsResponse>(
				`/api/geocode/place?id=${encodeURIComponent(placeId)}`,
			);
			const point = { lat: roundCoord(place.lat), lng: roundCoord(place.lng) };
			setDataCenter(point);
			mapRef.current?.getMap().flyTo({
				center: [place.lng, place.lat],
				zoom: 9,
				duration: 1200,
			});
		} catch {
			setSearchError("Couldn't look up that place — try again.");
		}
	}

	const scatteredEvents = declutter(events ?? []);
	const scatteredInitiatives = declutter(initiatives ?? []);
	const scatteredAlerts = declutter(alerts ?? []);

	const visibleEvents = bounds
		? scatteredEvents.filter((e) => bounds.contains([e.lng, e.lat]))
		: scatteredEvents;
	const visibleInitiatives = bounds
		? scatteredInitiatives.filter((i) => bounds.contains([i.lng, i.lat]))
		: scatteredInitiatives;
	const visibleAlerts = bounds
		? scatteredAlerts.filter((a) => bounds.contains([a.lng, a.lat]))
		: scatteredAlerts;

	return (
		<div className="relative h-full w-full">
			<MapGL
				ref={mapRef}
				initialViewState={{
					latitude: DEFAULT_CENTER.lat,
					longitude: DEFAULT_CENTER.lng,
					zoom: 3.5,
				}}
				mapStyle={MAP_STYLE}
				style={{ width: "100%", height: "100%" }}
				onLoad={syncBounds}
				onMoveEnd={syncBounds}
			>
				{visibleLayers.has("events") &&
					scatteredEvents.map((event) => (
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
					scatteredInitiatives.map((initiative) => (
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
					scatteredAlerts.map((alert) => (
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
					<div className="w-72 max-w-full rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
						<div className="relative">
							<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/50" />
							<GlassInput
								value={query}
								onChange={(e) => handleQueryChange(e.target.value)}
								onFocus={() => setShowSuggestions(true)}
								onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
								placeholder="Search a city, state, or country…"
								className="pl-9 text-sm"
							/>
							{showSuggestions && (suggestions.length > 0 || searchError) && (
								<div className="absolute top-full right-0 left-0 z-10 mt-2 overflow-hidden rounded-xl border border-white/20 bg-slate-900/90 shadow-lg backdrop-blur-xl">
									{searchError ? (
										<p className="px-4 py-3 text-sm text-red-300">
											{searchError}
										</p>
									) : (
										suggestions.map((s) => (
											<button
												key={s.placeId}
												type="button"
												onMouseDown={() =>
													handleSelectSuggestion(s.placeId, s.text)
												}
												className="block w-full px-4 py-2.5 text-left text-sm text-white/80 transition hover:bg-white/10"
											>
												{s.text}
											</button>
										))
									)}
								</div>
							)}
						</div>

						<p className="mt-3 text-sm text-white/70">Map layers</p>
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

						{(eventsLoading || eventsFetching || initiativesFetching) && (
							<p className="mt-3 text-[11px] text-forest-300">
								Searching this area for live events & initiatives…
							</p>
						)}
						<p className="mt-2 text-[11px] text-white/40">
							In view: {visibleEvents.length} of {scatteredEvents.length} events
							· {visibleInitiatives.length} of {scatteredInitiatives.length}{" "}
							initiatives · {visibleAlerts.length} of {scatteredAlerts.length}{" "}
							active alerts
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
