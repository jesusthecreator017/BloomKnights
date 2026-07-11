import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { LocateFixed, Search } from "lucide-react";
import { useRef, useState } from "react";
import { LayerPanel, PLACE_COLOR } from "#/components/layer-panel";
import { LocationDetailPanel } from "#/components/location-detail-panel";
import { GlassInput } from "#/components/ui/glass-input";
import {
	type EnvironmentLayer,
	useEnvironmentLayers,
} from "#/hooks/use-environment-layers";
import { ApiClientError, fetchJson } from "#/lib/api-client";
import type {
	PlaceAutocompleteResponse,
	PlaceDetailsResponse,
	PlaceKind,
	PlaceSuggestion,
} from "#/lib/api-types";

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
	const [layer, setLayer] = useState<EnvironmentLayer>("air-quality");
	const [placeKind, setPlaceKind] = useState<PlaceKind>("recycling");
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const { isLoaded, loadError } = useJsApiLoader({
		googleMapsApiKey: GOOGLE_MAPS_API_KEY,
	});

	const layerData = useEnvironmentLayers(center, layer, placeKind);

	function handleLocateMe() {
		if (!("geolocation" in navigator)) {
			setSearchError("Geolocation isn't available in this browser.");
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
				setCenter(point);
				setMarker(point);
				setAddress(undefined);
				setShowSuggestions(false);
			},
			() => setSearchError("Couldn't get your location — check permissions."),
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
		setAddress(undefined);
		setShowSuggestions(false);
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
				zoom={marker ? 16 : 4}
				onClick={handleMapClick}
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
			/>

			<div className="-translate-x-1/2 absolute top-4 left-1/2 z-10 flex w-[min(26rem,calc(100%-2rem))] items-start gap-2">
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
								<p className="px-4 py-3 text-sm text-red-300">{searchError}</p>
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
					title="Use my location"
					aria-label="Use my location"
					className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/70 shadow-lg backdrop-blur-xl transition hover:bg-white/15 hover:text-white"
				>
					<LocateFixed className="h-4 w-4" />
				</button>
			</div>

			{marker && (
				<LocationDetailPanel
					lat={marker.lat}
					lng={marker.lng}
					address={address}
					onClose={() => setMarker(null)}
				/>
			)}
		</div>
	);
}
