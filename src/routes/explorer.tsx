import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { lazy, Suspense } from "react";

const ExplorerMap = lazy(() => import("../components/explorer-map"));

export const Route = createFileRoute("/explorer")({ component: ExplorerPage });

function MapFallback() {
	return (
		<div className="flex h-full items-center justify-center text-muted-foreground">
			Loading map…
		</div>
	);
}

function ExplorerPage() {
	return (
		<div className="mx-auto max-w-6xl px-4 py-8">
			<div className="flex items-center gap-2">
				<Search className="h-6 w-6 text-forest-400" />
				<h1 className="text-3xl font-bold">Explore Anywhere</h1>
			</div>
			<p className="mt-2 max-w-2xl text-muted-foreground">
				Search an address, use your location, or click the map for live air
				quality, UV, ocean, and nearby-places data.
			</p>
			<div className="mt-6 h-[70vh] overflow-hidden rounded-2xl border border-white/15 shadow-2xl">
				<ClientOnly fallback={<MapFallback />}>
					<Suspense fallback={<MapFallback />}>
						<ExplorerMap />
					</Suspense>
				</ClientOnly>
			</div>
		</div>
	);
}
