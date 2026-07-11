import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const LiveMap = lazy(() => import("../components/live-map"));

export const Route = createFileRoute("/map")({ component: MapPage });

function MapFallback() {
	return (
		<div className="flex h-full items-center justify-center text-white/50">
			Loading map…
		</div>
	);
}

function MapPage() {
	return (
		<div className="mx-auto max-w-6xl px-4 py-8">
			<h1 className="text-3xl font-bold">Your Environment, Live</h1>
			<p className="mt-2 max-w-2xl text-white/70">
				Real-time air quality wherever you pan the map, plus events and places
				near you where you can be part of the solution.
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
