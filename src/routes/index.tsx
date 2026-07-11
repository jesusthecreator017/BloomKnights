import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Car,
	ClipboardList,
	Flame,
	ListChecks,
	MapPinned,
	Trash2,
	Trophy,
	Zap,
} from "lucide-react";
import { GlassButton } from "#/components/ui/glass-button";
import {
	GlassCard,
	GlassCardContent,
	GlassCardDescription,
	GlassCardHeader,
	GlassCardTitle,
} from "#/components/ui/glass-card";

export const Route = createFileRoute("/")({ component: Home });

const dailyDamage = [
	{
		icon: Flame,
		stat: "~44 kg",
		title: "CO2 per person, per day",
		description:
			"The average American emits roughly 16 tons of CO2 a year — about 4x the global average, mostly from home energy, driving, and what we buy.",
		source: {
			label: "EPA — Greenhouse Gas Emissions",
			url: "https://www.epa.gov/ghgemissions/sources-greenhouse-gas-emissions",
		},
	},
	{
		icon: Car,
		stat: "8.9 kg",
		title: "CO2 per gallon of gas",
		description:
			"Burning a single gallon releases nearly 9 kg of CO2, and transportation is the single largest source of US emissions.",
		source: {
			label: "EPA — Greenhouse Gas Emissions from a Vehicle",
			url: "https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle",
		},
	},
	{
		icon: Zap,
		stat: "~60%",
		title: "of US electricity is still fossil",
		description:
			"Every kilowatt-hour you don't use — or source from clean energy — is carbon that never enters the grid mix.",
		source: {
			label: "U.S. Energy Information Administration",
			url: "https://www.eia.gov/energyexplained/electricity/electricity-in-the-us.php",
		},
	},
	{
		icon: Trash2,
		stat: "2.2 kg",
		title: "of trash per person, per day",
		description:
			"Most of it is packaging and food waste, and less than a third of US municipal waste gets recycled or composted.",
		source: {
			label: "EPA — Facts and Figures about Materials, Waste and Recycling",
			url: "https://www.epa.gov/facts-and-figures-about-materials-waste-and-recycling",
		},
	},
] as const;

const features = [
	{
		icon: MapPinned,
		title: "Live map & Explorer",
		description:
			"Real-time air quality, UV, and ocean data anywhere you look, plus local clean-energy events, volunteer initiatives, and live weather emergencies.",
		to: "/map" as const,
	},
	{
		icon: ClipboardList,
		title: "Quizzes, grounded in real data",
		description:
			"Standard and Gemini-generated quizzes sourced from EPA, UN, and NOAA figures — learn the facts behind the footprint, not trivia.",
		to: "/quiz" as const,
	},
	{
		icon: Trophy,
		title: "City & individual leaderboards",
		description:
			"Compete on quiz points with your city, or check a live Environmental Score built from real air-quality data, updated daily.",
		to: "/leaderboard" as const,
	},
	{
		icon: ListChecks,
		title: "Resources",
		description:
			"Concrete clean-energy actions — community solar, heat pumps, repair over replace — next to live emissions data for any country.",
		to: "/resources" as const,
	},
] as const;

function Home() {
	return (
		<div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
			<section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
				<div className="text-left">
					<p className="font-semibold text-forest-400 text-sm uppercase tracking-widest">
						Ecoverse · Clean Energy Solution
					</p>
					<h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
						Everyday life has a footprint.{" "}
						<span className="bg-gradient-to-r from-forest-400 to-navy-300 bg-clip-text text-transparent">
							You can shrink it.
						</span>
					</h1>
					<p className="mt-4 max-w-xl text-lg text-muted-foreground">
						Ecoverse turns clean-energy awareness into action: a live map of
						real environmental data and local initiatives, facts-grounded
						quizzes, a leaderboard driven by real air-quality data, and concrete
						steps you can take today.
					</p>
					<div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
						<Link to="/map">
							<GlassButton size="lg">
								Explore the live map <ArrowRight className="ml-2 h-4 w-4" />
							</GlassButton>
						</Link>
						<Link to="/resources">
							<GlassButton variant="outline" size="lg">
								Start acting today
							</GlassButton>
						</Link>
					</div>
				</div>

				<HeroArt />
			</section>

			<div
				className="mt-16 h-px w-full bg-gradient-to-r from-transparent via-forest-400/50 to-transparent"
				aria-hidden="true"
			/>

			<section className="mt-16">
				<h2 className="text-center text-2xl font-semibold text-foreground/90">
					What Ecoverse does
				</h2>
				<div className="mt-8 grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{features.map((feature) => (
						<Link key={feature.title} to={feature.to} className="flex">
							<GlassCard className="flex h-full w-full flex-col transition hover:-translate-y-0.5">
								<GlassCardHeader>
									<feature.icon className="h-6 w-6 text-forest-400" />
									<GlassCardTitle className="mt-2 text-lg">
										{feature.title}
									</GlassCardTitle>
								</GlassCardHeader>
								<GlassCardContent className="flex-1">
									<p className="text-sm text-white/60">{feature.description}</p>
								</GlassCardContent>
							</GlassCard>
						</Link>
					))}
				</div>
			</section>

			<section className="mt-20">
				<h2 className="text-center text-2xl font-semibold text-foreground/90">
					The damage adds up daily
				</h2>
				<div className="mt-8 grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{dailyDamage.map((item) => (
						<GlassCard
							key={item.title}
							glowEffect={false}
							className="flex h-full flex-col"
						>
							<GlassCardHeader>
								<item.icon className="h-6 w-6 text-forest-400" />
								<GlassCardTitle className="mt-2 text-3xl">
									{item.stat}
								</GlassCardTitle>
								<GlassCardDescription className="font-medium text-white/80">
									{item.title}
								</GlassCardDescription>
							</GlassCardHeader>
							<GlassCardContent className="flex flex-1 flex-col">
								<p className="flex-1 text-sm text-white/60">
									{item.description}
								</p>
								<a
									href={item.source.url}
									target="_blank"
									rel="noreferrer"
									className="mt-3 block text-forest-400 text-xs hover:underline"
								>
									Source: {item.source.label}
								</a>
							</GlassCardContent>
						</GlassCard>
					))}
				</div>
			</section>
		</div>
	);
}

function HeroArt() {
	return (
		<div className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center">
			<div className="absolute inset-0 rounded-full bg-gradient-to-br from-forest-400/30 via-navy-400/20 to-transparent blur-2xl" />
			<GlassCard glowEffect={false} className="relative aspect-square w-full">
				<img
					src="/hero-photo.avif"
					alt="Ecoverse — clean energy in action"
					className="aspect-square w-full object-cover"
				/>
			</GlassCard>
		</div>
	);
}
