import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { GlassBadge } from "#/components/ui/glass-badge";
import {
	GlassCard,
	GlassCardContent,
	GlassCardHeader,
	GlassCardTitle,
} from "#/components/ui/glass-card";

export const Route = createFileRoute("/act")({ component: ActPage });

const actions = [
	{
		title: "Join community solar",
		impact: "Up to 1.5 tons CO2/yr",
		effort: "Easy",
		description:
			"No rooftop needed — subscribe to a shared solar farm and clean up your electricity in about 20 minutes.",
	},
	{
		title: "Swap one car trip a day",
		impact: "~1 ton CO2/yr",
		effort: "Easy",
		description:
			"Bike, walk, or take transit for your shortest daily trip. Short cold-engine drives are the least efficient ones.",
	},
	{
		title: "Switch to a heat pump",
		impact: "2–4 tons CO2/yr",
		effort: "Project",
		description:
			"Heating is most homes' biggest energy use. Federal rebates can cover thousands of dollars of the cost.",
	},
	{
		title: "Eat plant-forward twice a week",
		impact: "~0.5 ton CO2/yr",
		effort: "Easy",
		description:
			"Beef has ~10x the footprint of chicken and ~30x that of beans. Two swapped dinners a week adds up fast.",
	},
	{
		title: "Repair instead of replace",
		impact: "Less landfill + embodied carbon",
		effort: "Medium",
		description:
			"Most of a gadget's footprint happens before you ever turn it on. Repair cafés make fixing free and social.",
	},
	{
		title: "Show up locally",
		impact: "Multiplies everything",
		effort: "Easy",
		description:
			"Cleanups, tree plantings, and co-op info nights near you are on the map. Bring a friend — action is contagious.",
	},
] as const;

function ActPage() {
	return (
		<div className="mx-auto max-w-6xl px-4 py-16">
			<h1 className="text-3xl font-bold">Be part of the solution</h1>
			<p className="mt-2 max-w-2xl text-white/70">
				Small changes, done by many people, move the grid. Start with one of
				these — then find an event near you on the map.
			</p>

			<div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{actions.map((action) => (
					<GlassCard key={action.title} glowEffect={false}>
						<GlassCardHeader>
							<div className="flex items-center gap-2">
								<GlassBadge>{action.effort}</GlassBadge>
								<span className="text-xs text-emerald-400">
									{action.impact}
								</span>
							</div>
							<GlassCardTitle className="mt-1">{action.title}</GlassCardTitle>
						</GlassCardHeader>
						<GlassCardContent>
							<p className="text-sm text-white/60">{action.description}</p>
						</GlassCardContent>
					</GlassCard>
				))}
			</div>

			<div className="mt-10">
				<Link
					to="/map"
					className="inline-flex items-center gap-2 font-medium text-emerald-400 hover:underline"
				>
					Find an event near you <ArrowRight className="h-4 w-4" />
				</Link>
			</div>
		</div>
	);
}
