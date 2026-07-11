import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Car, Flame, Trash2, Zap } from "lucide-react";
import { GlassButton } from "#/components/ui/glass-button";
import {
	GlassCard,
	GlassCardContent,
	GlassCardDescription,
	GlassCardHeader,
	GlassCardTitle,
} from "#/components/ui/glass-card";
import { GlassProgress } from "#/components/ui/glass-progress";

export const Route = createFileRoute("/")({ component: Home });

const dailyDamage = [
	{
		icon: Flame,
		stat: "~44 kg",
		title: "CO2 per person, per day",
		description:
			"The average American emits roughly 16 tons of CO2 a year — 4x the global average. Most of it comes from home energy, driving, and what we buy.",
	},
	{
		icon: Car,
		stat: "8.9 kg",
		title: "CO2 per gallon of gas",
		description:
			"A single tank of gas releases over 100 kg of CO2. Transportation is the #1 source of US emissions.",
	},
	{
		icon: Zap,
		stat: "~60%",
		title: "of US electricity is still fossil",
		description:
			"Every kilowatt-hour you don't use — or source from clean energy — keeps carbon out of the air.",
	},
	{
		icon: Trash2,
		stat: "2.2 kg",
		title: "of trash per person, per day",
		description:
			"Most of it is packaging and food waste, and less than a third gets recycled or composted.",
	},
] as const;

const communityGoals = [
	{ label: "CO2 offset this month", current: 3120, target: 5000, unit: "kg" },
	{ label: "Clean-energy events joined", current: 84, target: 150, unit: "" },
	{
		label: "Repair-instead-of-replace pledges",
		current: 41,
		target: 100,
		unit: "",
	},
] as const;

function Home() {
	return (
		<div className="mx-auto max-w-6xl px-4 py-16">
			<section className="text-center">
				<p className="font-semibold text-forest-400 text-sm uppercase tracking-widest">
					BloomKnights
				</p>
				<h1 className="mx-auto mt-3 max-w-3xl text-5xl font-bold leading-tight tracking-tight">
					Everyday life has a footprint.{" "}
					<span className="bg-gradient-to-r from-forest-400 to-navy-300 bg-clip-text text-transparent">
						You can shrink it.
					</span>
				</h1>
				<p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
					See the real environmental cost of daily habits, check the air you're
					breathing right now, and find clean-energy actions and events near
					you.
				</p>
				<div className="mt-8 flex items-center justify-center gap-4">
					<Link to="/map">
						<GlassButton size="lg">
							Explore the live map <ArrowRight className="ml-2 h-4 w-4" />
						</GlassButton>
					</Link>
					<Link to="/act">
						<GlassButton variant="outline" size="lg">
							Start acting today
						</GlassButton>
					</Link>
				</div>
			</section>

			<section className="mt-20">
				<h2 className="text-center text-2xl font-semibold text-white/90">
					The damage adds up daily
				</h2>
				<div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{dailyDamage.map((item) => (
						<GlassCard key={item.title} glowEffect={false}>
							<GlassCardHeader>
								<item.icon className="h-6 w-6 text-forest-400" />
								<GlassCardTitle className="mt-2 text-3xl">
									{item.stat}
								</GlassCardTitle>
								<GlassCardDescription className="font-medium text-white/80">
									{item.title}
								</GlassCardDescription>
							</GlassCardHeader>
							<GlassCardContent>
								<p className="text-sm text-white/60">{item.description}</p>
							</GlassCardContent>
						</GlassCard>
					))}
				</div>
			</section>

			<section className="mt-20">
				<h2 className="text-center text-2xl font-semibold text-white/90">
					Community progress this month
				</h2>
				<GlassCard glowEffect={false} className="mx-auto mt-8 max-w-2xl">
					<GlassCardContent className="flex flex-col gap-6 pt-6">
						{communityGoals.map((goal) => (
							<div key={goal.label}>
								<div className="mb-2 flex items-baseline justify-between text-sm">
									<span className="text-white/80">{goal.label}</span>
									<span className="text-white/50">
										{goal.current.toLocaleString()} /{" "}
										{goal.target.toLocaleString()}
										{goal.unit && ` ${goal.unit}`}
									</span>
								</div>
								<GlassProgress value={(goal.current / goal.target) * 100} />
							</div>
						))}
					</GlassCardContent>
				</GlassCard>
			</section>
		</div>
	);
}
