import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { useQuery } from "@tanstack/react-query";
import { Crosshair, LocateFixed, Search } from "lucide-react";
import { useRef, useState } from "react";
import { LayerPanel, PLACE_COLOR } from "#/components/layer-panel";
import { GlassInput } from "#/components/ui/glass-input";
import {
	type EnvironmentLayer,
	useEnvironmentLayers,
} from "#/hooks/use-environment-layers";
import { ApiClientError, fetchJson } from "#/lib/api-client";
import type {
	MarineLifeResponse,
	PlaceAutocompleteResponse,
	PlaceDetailsResponse,
	PlaceKind,
	PlaceSuggestion,
} from "#/lib/api-types";
import { aqiColor } from "#/lib/environment-format";
import { cn } from "#/lib/utils";

/** Simple green -> yellow -> red ramp for a 0-11 UV index. */
function uvColor(uv: number): string {
	if (uv >= 8) return "#ef4444";
	if (uv >= 6) return "#f59e0b";
	if (uv >= 3) return "#facc15";
	return "#3ebd49";
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";
const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 };

// dark, forest/navy-tinted map so it matches the rest of the app instead of
// stock Google Maps colors
const MAP_STYLE: google.maps.MapTypeStyle[] = [
	{ elementType: "geometry", stylers: [{ color: "#0f1b2e" }] },
	{ elementType: "labels.text.stroke", stylers: [{ color: "#050b16" }] },
	{ elementType: "labels.text.fill", stylers: [{ color: "#c7d3e3" }] },
	{
		featureType: "water",
		elementType: "geometry",
		stylers: [{ color: "#08132b" }],
	},
	{
		featureType: "landscape",
		elementType: "geometry",
		stylers: [{ color: "#12251c" }],
	},
	{
		featureType: "poi",
		elementType: "geometry",
		stylers: [{ color: "#16301f" }],
	},
	{
		featureType: "poi.park",
		elementType: "geometry",
		stylers: [{ color: "#1c3a24" }],
	},
	{
		featureType: "road",
		elementType: "geometry",
		stylers: [{ color: "#1c2f42" }],
	},
	{
		featureType: "road",
		elementType: "geometry.stroke",
		stylers: [{ color: "#142234" }],
	},
	{
		featureType: "administrative",
		elementType: "geometry.stroke",
		stylers: [{ color: "#2a4a6b" }],
	},
];

function MessageOverlay({ message }: { message: string }) {
	return (
		<div className="flex h-full w-full items-center justify-center bg-[#050b16] p-6 text-center text-sm text-white/50">
			{message}
		</div>
	);
}

export default function ExplorerMap() {
	const [center, setCenter] = useState(DEFAULT_CENTER);
	const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
		null,
	);
	const [address, setAddress] = useState<string | undefined>();
	const [query, setQuery] = useState("");
	const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);
	const [locating, setLocating] = useState(false);
	const [layer, setLayer] = useState<EnvironmentLayer>("air-quality");
	const [placeKind, setPlaceKind] = useState<PlaceKind>("recycling");
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const mapRef = useRef<google.maps.Map | null>(null);

	const { isLoaded, loadError } = useJsApiLoader({
		googleMapsApiKey: GOOGLE_MAPS_API_KEY,
	});

	const activePoint = marker ?? center;
	const layerData = useEnvironmentLayers(activePoint, layer, placeKind);
	const { data: marineLife } = useQuery({
		queryKey: ["marine-life", activePoint],
		queryFn: () =>
			fetchJson<MarineLifeResponse>(
				`/api/marine-life?lat=${activePoint.lat}&lng=${activePoint.lng}`,
			),
		enabled: layer === "ocean-coral",
	});

	function handleSearchHere() {
		const mapCenter = mapRef.current?.getCenter();
		if (!mapCenter) return;
		setCenter({ lat: mapCenter.lat(), lng: mapCenter.lng() });
	}

	function handleLocateMe() {
		if (!("geolocation" in navigator)) {
			setSearchError("Geolocation isn't available in this browser.");
			return;
		}
		setLocating(true);
		setSearchError(null);
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
				setCenter(point);
				setMarker(point);
				setAddress(undefined);
				setShowSuggestions(false);
				setLocating(false);
			},
			() => {
				setSearchError("Couldn't get your location — check permissions.");
				setLocating(false);
			},
			{ enableHighAccuracy: true, timeout: 10_000 },
		);
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
						? "Address search isn't configured yet — click the map instead."
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
			setCenter({ lat: place.lat, lng: place.lng });
			setMarker({ lat: place.lat, lng: place.lng });
			setAddress(place.formattedAddress);
		} catch {
			setSearchError("Couldn't look up that place — try again.");
		}
	}

	function handleMapClick(e: google.maps.MapMouseEvent) {
		const lat = e.latLng?.lat();
		const lng = e.latLng?.lng();
		if (lat == null || lng == null) return;
		setMarker({ lat, lng });
		setCenter({ lat, lng });
		setAddress(undefined);
		setShowSuggestions(false);
	}

	function clearSelection() {
		setMarker(null);
		setAddress(undefined);
	}

	/** Summary of whichever layer is currently active, for the Ask AI grounding — not hardcoded to air quality. */
	function currentLiveData(): string | undefined {
		if (layer === "air-quality" && layerData.air?.current?.us_aqi != null) {
			return `AQI ${layerData.air.current.us_aqi}`;
		}
		if (layer === "uv-solar" && layerData.uvSolar?.current) {
			return `UV index ${layerData.uvSolar.current.uv_index}`;
		}
		if (
			layer === "ocean-coral" &&
			layerData.ocean?.current?.sea_surface_temperature != null
		) {
			return `Sea surface temp ${layerData.ocean.current.sea_surface_temperature}°C`;
		}
		if (layer === "places" && layerData.places) {
			return `${layerData.places.count} ${placeKind} facilities within 15km`;
		}
		return undefined;
	}

	if (!GOOGLE_MAPS_API_KEY) {
		return (
			<MessageOverlay message="Add VITE_GOOGLE_MAPS_API_KEY to a .env.local file to enable the live map (see .env.example)." />
		);
	}
	if (loadError) {
		return (
			<MessageOverlay message="Google Maps failed to load. Check your API key and that the Maps JavaScript API is enabled." />
		);
	}
	if (!isLoaded) {
		return <MessageOverlay message="Loading map…" />;
	}

	return (
		<div className="relative h-full w-full">
			<GoogleMap
				mapContainerStyle={{ width: "100%", height: "100%" }}
				center={center}
				zoom={marker ? 13 : 4}
				onClick={handleMapClick}
				onLoad={(map) => {
					mapRef.current = map;
				}}
				options={{
					styles: MAP_STYLE,
					mapTypeControl: true,
					streetViewControl: true,
					fullscreenControl: true,
					zoomControl: true,
					clickableIcons: true,
				}}
			>
				{marker && <Marker position={marker} />}

				{layer === "air-quality" && layerData.air?.current?.us_aqi != null && (
					<Marker
						position={activePoint}
						icon={{
							path: google.maps.SymbolPath.CIRCLE,
							scale: 10,
							fillColor: aqiColor(layerData.air.current.us_aqi),
							fillOpacity: 0.9,
							strokeColor: "#050b16",
							strokeWeight: 2,
						}}
					/>
				)}

				{layer === "uv-solar" && layerData.uvSolar?.current && (
					<Marker
						position={activePoint}
						icon={{
							path: google.maps.SymbolPath.CIRCLE,
							scale: 10,
							fillColor: uvColor(layerData.uvSolar.current.uv_index),
							fillOpacity: 0.9,
							strokeColor: "#050b16",
							strokeWeight: 2,
						}}
					/>
				)}

				{layer === "ocean-coral" &&
					layerData.ocean?.current?.sea_surface_temperature != null && (
						<Marker
							position={activePoint}
							icon={{
								path: google.maps.SymbolPath.CIRCLE,
								scale: 10,
								fillColor: "#38bdf8",
								fillOpacity: 0.9,
								strokeColor: "#050b16",
								strokeWeight: 2,
							}}
						/>
					)}

				{layer === "places" &&
					layerData.places?.places.map((place) => (
						<Marker
							key={place.id}
							position={{ lat: place.lat, lng: place.lng }}
							icon={{
								path: google.maps.SymbolPath.CIRCLE,
								scale: 7,
								fillColor: PLACE_COLOR[placeKind],
								fillOpacity: 1,
								strokeColor: "#050b16",
								strokeWeight: 1.5,
							}}
						/>
					))}
			</GoogleMap>

			<LayerPanel
				layer={layer}
				onLayerChange={setLayer}
				placeKind={placeKind}
				onPlaceKindChange={setPlaceKind}
				air={layerData.air}
				uvSolar={layerData.uvSolar}
				ocean={layerData.ocean}
				coral={layerData.coral}
				places={layerData.places}
				marineLife={marineLife}
				title={marker ? (address ?? "Selected location") : undefined}
				onClearSelection={marker ? clearSelection : undefined}
				askContext={{
					kind: "location",
					name: address,
					lat: activePoint.lat,
					lng: activePoint.lng,
					liveData: currentLiveData(),
				}}
			/>

			<div className="-translate-x-1/2 absolute top-4 left-1/2 z-10 flex w-[min(26rem,calc(100%-2rem))] flex-col gap-2">
				<div className="flex items-start gap-2">
					<div className="relative flex-1">
						<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/50" />
						<GlassInput
							value={query}
							onChange={(e) => handleQueryChange(e.target.value)}
							onFocus={() => setShowSuggestions(true)}
							onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
							placeholder="Search an address or click the map…"
							className="pl-9"
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
					<button
						type="button"
						onClick={handleLocateMe}
						disabled={locating}
						title="Use my location"
						aria-label="Use my location"
						className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/70 shadow-lg backdrop-blur-xl transition hover:bg-white/15 hover:text-white disabled:opacity-60"
					>
						<LocateFixed
							className={cn("h-4 w-4", locating && "animate-pulse")}
						/>
					</button>
				</div>

				{searchError && !showSuggestions && (
					<p className="self-center rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-red-200 text-xs shadow-lg backdrop-blur-xl">
						{searchError}
					</p>
				)}

				<button
					type="button"
					onClick={handleSearchHere}
					className="flex items-center justify-center gap-1.5 self-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-white/80 text-xs shadow-lg backdrop-blur-xl transition hover:bg-white/15 hover:text-white"
				>
					<Crosshair className="h-3.5 w-3.5" /> Search here
				</button>
			</div>
		</div>
	);
}
