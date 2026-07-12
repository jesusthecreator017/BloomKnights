import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { Gamepad2 } from "lucide-react";
import { lazy, Suspense } from "react";

const EcoGame = lazy(() => import("../components/eco-game"));

export const Route = createFileRoute("/game")({ component: GamePage });

function GameFallback() {
	return (
		<div className="flex h-80 items-center justify-center text-muted-foreground">
			Loading game…
		</div>
	);
}

function GamePage() {
	return (
		<div className="mx-auto max-w-6xl px-4 py-8">
			<div className="flex items-center gap-2">
				<Gamepad2 className="h-6 w-6 text-forest-400" />
				<h1 className="text-3xl font-bold">Clean Energy Quest</h1>
			</div>
			<p className="mt-2 max-w-2xl text-muted-foreground">
				A tiny side-scroller — walk into each problem and pick the clean-energy
				fix.
			</p>
			<div className="mt-6">
				<ClientOnly fallback={<GameFallback />}>
					<Suspense fallback={<GameFallback />}>
						<EcoGame />
					</Suspense>
				</ClientOnly>
			</div>
		</div>
	);
}
