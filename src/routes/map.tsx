import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { MapPinned } from "lucide-react";
import { lazy, Suspense } from "react";

const LiveMap = lazy(() => import("../components/live-map"));

export const Route = createFileRoute("/map")({ component: MapPage });

function MapFallback() {
	return (
		<div className="flex h-full items-center justify-center text-muted-foreground">
			Loading map…
		</div>
	);
}

function MapPage() {
	return (
		<div className="mx-auto max-w-6xl px-4 py-8">
			<div className="flex items-center gap-2">
				<MapPinned className="h-6 w-6 text-forest-400" />
				<h1 className="text-3xl font-bold">Your Environment, Live</h1>
			</div>
			<p className="mt-2 max-w-2xl text-muted-foreground">
				Real local clean-energy events, volunteer initiatives, and active
				weather emergencies — toggle layers on the left and click any marker for
				details.
			</p>
			<div className="mt-6 h-[70vh] overflow-hidden rounded-2xl border border-white/15 shadow-2xl">
				<ClientOnly fallback={<MapFallback />}>
					<Suspense fallback={<MapFallback />}>
						<LiveMap />
					</Suspense>
				</ClientOnly>
			</div>
		</div>
	);
}
