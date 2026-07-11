import {
	Autocomplete,
	GoogleMap,
	Marker,
	useJsApiLoader,
} from "@react-google-maps/api";
import { Search } from "lucide-react";
import { useRef, useState } from "react";
import { GlassInput } from "#/components/ui/glass-input";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";
const LIBRARIES: "places"[] = ["places"];
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
	const [autocomplete, setAutocomplete] =
		useState<google.maps.places.Autocomplete | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const { isLoaded, loadError } = useJsApiLoader({
		googleMapsApiKey: GOOGLE_MAPS_API_KEY,
		libraries: LIBRARIES,
	});

	function handlePlaceChanged() {
		const place = autocomplete?.getPlace();
		const lat = place?.geometry?.location?.lat();
		const lng = place?.geometry?.location?.lng();
		if (lat == null || lng == null) return;
		setCenter({ lat, lng });
		setMarker({ lat, lng });
	}

	if (!GOOGLE_MAPS_API_KEY) {
		return (
			<MessageOverlay message="Add VITE_GOOGLE_MAPS_API_KEY to a .env.local file to enable the live map (see .env.example)." />
		);
	}
	if (loadError) {
		return (
			<MessageOverlay message="Google Maps failed to load. Check your API key and that the Maps JavaScript API + Places API are enabled." />
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

			<div className="absolute top-4 left-4 z-10 w-[min(22rem,calc(100%-2rem))]">
				<Autocomplete
					onLoad={setAutocomplete}
					onPlaceChanged={handlePlaceChanged}
					options={{ fields: ["formatted_address", "geometry"] }}
				>
					<div className="relative">
						<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/50" />
						<GlassInput
							ref={inputRef}
							placeholder="Search an address…"
							className="pl-9"
						/>
					</div>
				</Autocomplete>
			</div>
		</div>
	);
}
