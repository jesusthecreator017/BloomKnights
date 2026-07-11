import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Search } from "lucide-react";
import { useRef, useState } from "react";
import { LocationDetailPanel } from "#/components/location-detail-panel";
import { GlassInput } from "#/components/ui/glass-input";
import { fetchJson } from "#/lib/api-client";
import type {
	PlaceAutocompleteResponse,
	PlaceDetailsResponse,
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
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const { isLoaded, loadError } = useJsApiLoader({
		googleMapsApiKey: GOOGLE_MAPS_API_KEY,
	});

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
			} catch {
				setSuggestions([]);
				setSearchError("Search isn't available right now.");
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
			</GoogleMap>

			<div className="-translate-x-1/2 absolute top-4 left-1/2 z-10 w-[min(26rem,calc(100%-2rem))]">
				<div className="relative">
					<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/50" />
					<GlassInput
						value={query}
						onChange={(e) => handleQueryChange(e.target.value)}
						onFocus={() => setShowSuggestions(true)}
						onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
						placeholder="Search an address or click the map…"
						className="pl-9"
					/>
				</div>

				{showSuggestions && (suggestions.length > 0 || searchError) && (
					<div className="mt-2 overflow-hidden rounded-xl border border-white/20 bg-slate-900/90 shadow-lg backdrop-blur-xl">
						{searchError ? (
							<p className="px-4 py-3 text-sm text-red-300">{searchError}</p>
						) : (
							suggestions.map((s) => (
								<button
									key={s.placeId}
									type="button"
									onMouseDown={() => handleSelectSuggestion(s.placeId, s.text)}
									className="block w-full px-4 py-2.5 text-left text-sm text-white/80 transition hover:bg-white/10"
								>
									{s.text}
								</button>
							))
						)}
					</div>
				)}
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
