import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const ExplorerMap = lazy(() => import("../components/explorer-map"));

export const Route = createFileRoute("/explorer")({ component: ExplorerPage });

function MapFallback() {
	return (
		<div className="flex h-full items-center justify-center text-white/50">
			Loading map…
		</div>
	);
}

function ExplorerPage() {
	return (
		<div className="h-[calc(100vh-4rem)] w-full">
			<ClientOnly fallback={<MapFallback />}>
				<Suspense fallback={<MapFallback />}>
					<ExplorerMap />
				</Suspense>
			</ClientOnly>
		</div>
	);
}
