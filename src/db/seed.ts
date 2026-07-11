import { eq } from "drizzle-orm";
import { db } from "./index";
import {
	cities,
	questions,
	quizAttempts,
	quizzes,
	user,
	userCities,
} from "./schema";

const seedCities = [
	// US
	{
		slug: "nyc",
		name: "New York City",
		country: "USA",
		lat: 40.7128,
		lng: -74.006,
	},
	{
		slug: "los-angeles",
		name: "Los Angeles",
		country: "USA",
		lat: 34.0522,
		lng: -118.2437,
	},
	{
		slug: "chicago",
		name: "Chicago",
		country: "USA",
		lat: 41.8781,
		lng: -87.6298,
	},
	{
		slug: "orlando",
		name: "Orlando",
		country: "USA",
		lat: 28.5383,
		lng: -81.3792,
	},
	{
		slug: "san-francisco",
		name: "San Francisco",
		country: "USA",
		lat: 37.7749,
		lng: -122.4194,
	},
	{
		slug: "seattle",
		name: "Seattle",
		country: "USA",
		lat: 47.6062,
		lng: -122.3321,
	},
	{
		slug: "austin",
		name: "Austin",
		country: "USA",
		lat: 30.2672,
		lng: -97.7431,
	},
	{
		slug: "denver",
		name: "Denver",
		country: "USA",
		lat: 39.7392,
		lng: -104.9903,
	},
	{ slug: "miami", name: "Miami", country: "USA", lat: 25.7617, lng: -80.1918 },
	{
		slug: "boston",
		name: "Boston",
		country: "USA",
		lat: 42.3601,
		lng: -71.0589,
	},
	{
		slug: "houston",
		name: "Houston",
		country: "USA",
		lat: 29.7604,
		lng: -95.3698,
	},
	{
		slug: "atlanta",
		name: "Atlanta",
		country: "USA",
		lat: 33.749,
		lng: -84.388,
	},
	{
		slug: "portland",
		name: "Portland",
		country: "USA",
		lat: 45.5152,
		lng: -122.6784,
	},
	{
		slug: "washington-dc",
		name: "Washington D.C.",
		country: "USA",
		lat: 38.9072,
		lng: -77.0369,
	},
	// global
	{
		slug: "london",
		name: "London",
		country: "United Kingdom",
		lat: 51.5074,
		lng: -0.1278,
	},
	{
		slug: "tokyo",
		name: "Tokyo",
		country: "Japan",
		lat: 35.6762,
		lng: 139.6503,
	},
	{
		slug: "paris",
		name: "Paris",
		country: "France",
		lat: 48.8566,
		lng: 2.3522,
	},
	{
		slug: "berlin",
		name: "Berlin",
		country: "Germany",
		lat: 52.52,
		lng: 13.405,
	},
	{
		slug: "toronto",
		name: "Toronto",
		country: "Canada",
		lat: 43.6532,
		lng: -79.3832,
	},
	{
		slug: "sydney",
		name: "Sydney",
		country: "Australia",
		lat: -33.8688,
		lng: 151.2093,
	},
	{
		slug: "singapore",
		name: "Singapore",
		country: "Singapore",
		lat: 1.3521,
		lng: 103.8198,
	},
	{
		slug: "amsterdam",
		name: "Amsterdam",
		country: "Netherlands",
		lat: 52.3676,
		lng: 4.9041,
	},
	{
		slug: "stockholm",
		name: "Stockholm",
		country: "Sweden",
		lat: 59.3293,
		lng: 18.0686,
	},
	{
		slug: "dubai",
		name: "Dubai",
		country: "United Arab Emirates",
		lat: 25.2048,
		lng: 55.2708,
	},
	{
		slug: "mexico-city",
		name: "Mexico City",
		country: "Mexico",
		lat: 19.4326,
		lng: -99.1332,
	},
	{
		slug: "sao-paulo",
		name: "São Paulo",
		country: "Brazil",
		lat: -23.5505,
		lng: -46.6333,
	},
] as const;

const seedQuizzes = [
	{
		slug: "clean-energy-basics",
		title: "Clean Energy Basics",
		category: "clean-energy",
		questions: [
			{
				prompt:
					"Which energy source is now the cheapest to build in most of the world?",
				choices: ["Coal", "Solar", "Natural gas", "Nuclear"],
				correctIndex: 1,
				explanation:
					"Utility-scale solar became the cheapest new electricity in history according to the IEA — costs fell ~90% since 2010.",
			},
			{
				prompt:
					"What share of a home's energy use typically goes to heating and cooling?",
				choices: ["About 10%", "About 25%", "About 50%", "About 80%"],
				correctIndex: 2,
				explanation:
					"Roughly half of home energy goes to heating and cooling, which is why heat pumps are such a big lever.",
			},
			{
				prompt: "A heat pump heats your home by…",
				choices: [
					"Burning cleaner gas",
					"Moving heat from outside air indoors",
					"Generating heat from electricity like a toaster",
					"Storing summer heat underground",
				],
				correctIndex: 1,
				explanation:
					"Heat pumps move heat rather than create it, making them 3-4x more efficient than resistance heating or furnaces.",
			},
			{
				prompt: "Community solar lets you…",
				choices: [
					"Only power community buildings",
					"Subscribe to a shared solar farm without a rooftop",
					"Sell your roof to the utility",
					"Get free panels from the government",
				],
				correctIndex: 1,
				explanation:
					"Community solar shares one solar farm's output among subscribers — renters and apartment dwellers can join too.",
			},
			{
				prompt:
					"Globally, what share of electricity still comes from burning coal, oil, or gas?",
				choices: ["About 1/10", "About 1/3", "About 2/3", "Almost all of it"],
				correctIndex: 1,
				explanation:
					"The UN estimates roughly a third of global electricity still comes from fossil fuels — the main reason the grid itself still has a footprint.",
			},
		],
	},
	{
		slug: "daily-footprint",
		title: "Your Daily Footprint",
		category: "awareness",
		questions: [
			{
				prompt: "How much CO2 does burning one gallon of gasoline release?",
				choices: ["0.9 kg", "3.2 kg", "8.9 kg", "20 kg"],
				correctIndex: 2,
				explanation:
					"Each gallon releases about 8.9 kg of CO2 — the carbon comes from the air's oxygen bonding with the fuel's carbon.",
			},
			{
				prompt: "Which food has the highest carbon footprint per kilogram?",
				choices: ["Chicken", "Beef", "Tofu", "Rice"],
				correctIndex: 1,
				explanation:
					"Beef produces ~60 kg CO2e per kg — about 10x chicken and 30x beans, mostly from methane and land use.",
			},
			{
				prompt: "How much trash does the average American produce per day?",
				choices: ["0.5 kg", "1 kg", "2.2 kg", "5 kg"],
				correctIndex: 2,
				explanation:
					"About 2.2 kg (4.9 lbs) per person per day, and less than a third is recycled or composted.",
			},
			{
				prompt: "The average American's yearly CO2 emissions are about…",
				choices: [
					"4 tons (the global average)",
					"8 tons",
					"16 tons",
					"40 tons",
				],
				correctIndex: 2,
				explanation:
					"~16 tons per year, roughly 4x the global average — which also means US individual choices matter more.",
			},
			{
				prompt:
					"What's the single biggest lever an individual has to cut their own footprint?",
				choices: [
					"Recycling more",
					"Home energy, transportation, and diet choices",
					"Using paper straws",
					"Turning off lights when leaving a room",
				],
				correctIndex: 1,
				explanation:
					"Home energy source, how you get around, and what you eat dwarf small habits like straws or standby power in total impact.",
			},
		],
	},
	{
		slug: "oceans-and-air",
		title: "Oceans & Air",
		category: "ecosystems",
		questions: [
			{
				prompt: "What causes coral bleaching?",
				choices: [
					"Plastic pollution",
					"Prolonged heat stress in the water",
					"Overfishing",
					"Sunscreen only",
				],
				correctIndex: 1,
				explanation:
					"Sustained above-normal sea temperatures make corals expel their symbiotic algae — NOAA tracks this heat stress globally.",
			},
			{
				prompt: "What share of the CO2 humans emit is absorbed by the ocean?",
				choices: ["About 5%", "About 25%", "About 50%", "About 90%"],
				correctIndex: 1,
				explanation:
					"Oceans absorb roughly a quarter of our CO2 — buffering warming but acidifying the water marine life depends on.",
			},
			{
				prompt: "A US AQI reading of 155 means the air is…",
				choices: ["Good", "Moderate", "Unhealthy", "Only bad for astronauts"],
				correctIndex: 2,
				explanation:
					"151-200 is 'Unhealthy': everyone may experience effects, and sensitive groups should limit outdoor exertion.",
			},
			{
				prompt: "Most ocean plastic comes from…",
				choices: [
					"Ships dumping at sea",
					"Land-based waste carried by rivers",
					"Fishing gear only",
					"Beach litter only",
				],
				correctIndex: 1,
				explanation:
					"Rivers carry most mismanaged land waste to the sea — which is why local cleanups far from the coast still help.",
			},
			{
				prompt:
					"Arctic temperatures are warming compared to the global average…",
				choices: [
					"At about the same rate",
					"At least twice as fast",
					"Slightly slower",
					"Not warming at all",
				],
				correctIndex: 1,
				explanation:
					"The Arctic is warming at least twice as fast as the global average, accelerating ice melt and sea level rise.",
			},
		],
	},
	{
		slug: "greenhouse-gas-sources",
		title: "Where US Emissions Come From",
		category: "emissions",
		questions: [
			{
				prompt: "About how much CO2-equivalent did the US emit in 2022?",
				choices: [
					"~600 million metric tons",
					"~6,343 million metric tons",
					"~60,000 million metric tons",
					"~1 million metric tons",
				],
				correctIndex: 1,
				explanation:
					"EPA reports total 2022 US greenhouse gas emissions at 6,343.2 million metric tons of CO2 equivalent.",
			},
			{
				prompt:
					"What share of US electricity do buildings (homes + commercial) use?",
				choices: ["About 25%", "About 50%", "About 75%", "Almost none"],
				correctIndex: 2,
				explanation:
					"EPA data shows buildings use about 75% of all electricity generated in the US — a huge lever for efficiency and clean power.",
			},
			{
				prompt: "What share of US transportation fuel is petroleum-based?",
				choices: ["About 50%", "About 70%", "Over 94%", "About 20%"],
				correctIndex: 2,
				explanation:
					"Over 94% of the fuel used for US transportation is still petroleum-based, per EPA — the main reason transportation leads US emissions.",
			},
			{
				prompt:
					"How have gross US greenhouse gas emissions changed since 1990?",
				choices: [
					"Down just over 3%",
					"Up about 20%",
					"Cut in half",
					"Unchanged",
				],
				correctIndex: 0,
				explanation:
					"EPA reports gross US emissions are down just over 3% since 1990 — progress, but far short of climate targets.",
			},
			{
				prompt:
					"US forests and land use act as a carbon sink that offsets roughly…",
				choices: [
					"1% of emissions",
					"13% of emissions",
					"50% of emissions",
					"None — they add emissions",
				],
				correctIndex: 1,
				explanation:
					"EPA estimates land use, land-use change, and forestry offset about 13% of total US greenhouse gas emissions each year.",
			},
		],
	},
	{
		slug: "climate-causes-global",
		title: "What's Driving Climate Change",
		category: "climate-science",
		questions: [
			{
				prompt:
					"Fossil fuels account for roughly what share of global greenhouse gas emissions?",
				choices: ["About 30%", "About 50%", "About 68%", "About 95%"],
				correctIndex: 2,
				explanation:
					"The UN puts fossil fuels — coal, oil, and gas — at around 68% of global greenhouse gas emissions, by far the largest contributor.",
			},
			{
				prompt:
					"About what share of all human CO2 emissions comes from fossil fuels specifically?",
				choices: ["About 40%", "About 60%", "Nearly 90%", "About 10%"],
				correctIndex: 2,
				explanation:
					"Nearly 90% of all human CO2 emissions come from fossil fuels, per the UN — the rest mostly from land use and industrial processes.",
			},
			{
				prompt:
					"Buildings account for roughly what share of global electricity consumption?",
				choices: ["About 10%", "About 25%", "About 60%", "About 90%"],
				correctIndex: 2,
				explanation:
					"The UN estimates buildings consume nearly 60% of all electricity generated worldwide.",
			},
			{
				prompt:
					"Transportation accounts for roughly what share of global energy-related CO2 emissions?",
				choices: ["About 1/4", "About 1/2", "About 3/4", "Under 5%"],
				correctIndex: 0,
				explanation:
					"Transportation is responsible for nearly a quarter of global energy-related CO2 emissions, per the UN.",
			},
			{
				prompt:
					"The 20 largest economies are responsible for about what share of global emissions?",
				choices: ["20%", "50%", "80%", "100%"],
				correctIndex: 2,
				explanation:
					"The UN estimates the G20 economies account for almost 80% of global greenhouse gas emissions.",
			},
		],
	},
	{
		slug: "climate-effects",
		title: "Climate Change: The Effects",
		category: "climate-science",
		questions: [
			{
				prompt: "Which decade is the warmest on record so far?",
				choices: ["1990s", "2000s", "2005-2014", "2015-2024"],
				correctIndex: 3,
				explanation:
					"The UN reports 2015-2024 as the warmest decade on record, continuing an accelerating warming trend.",
			},
			{
				prompt:
					"Species are going extinct at roughly what rate compared to natural background levels?",
				choices: [
					"About the same rate",
					"10x faster",
					"100x faster",
					"1,000x faster",
				],
				correctIndex: 3,
				explanation:
					"The UN cites species loss at roughly 1,000 times the natural background extinction rate, with about a million species at risk.",
			},
			{
				prompt:
					"About how many people were displaced by weather-related disasters in 2024?",
				choices: ["450,000", "4.5 million", "45.8 million", "450 million"],
				correctIndex: 2,
				explanation:
					"An estimated 45.8 million people were displaced by weather-related disasters in 2024, per UN figures.",
			},
			{
				prompt:
					"Roughly how many deaths per year are linked to environmental factors like pollution and climate impacts?",
				choices: ["13,000", "1.3 million", "13 million", "130 million"],
				correctIndex: 2,
				explanation:
					"The UN links roughly 13 million deaths a year to environmental factors, including air pollution and climate-driven hazards.",
			},
			{
				prompt: "Compared to the rest of the planet, the Arctic is warming…",
				choices: [
					"Slower than average",
					"At the same rate",
					"At least twice as fast",
					"It isn't warming",
				],
				correctIndex: 2,
				explanation:
					"Arctic temperatures have warmed at least twice as fast as the global average, accelerating sea ice and permafrost loss.",
			},
		],
	},
	{
		slug: "resource-consumption",
		title: "Resources, Waste & Consumption",
		category: "resources",
		questions: [
			{
				prompt:
					"How has global material extraction (minerals, fossil fuels, biomass) changed since 1970?",
				choices: [
					"Stayed about the same",
					"Roughly doubled",
					"Roughly tripled",
					"Fallen by half",
				],
				correctIndex: 2,
				explanation:
					"Global resource extraction has roughly tripled since 1970 as population and consumption both grew, straining ecosystems and the climate.",
			},
			{
				prompt:
					"How does the average material footprint of someone in a high-income country compare to someone in a low-income country?",
				choices: [
					"About the same",
					"Roughly double",
					"Several times higher",
					"Lower",
				],
				correctIndex: 2,
				explanation:
					"People in high-income countries consume several times more raw materials per person than those in low-income countries.",
			},
			{
				prompt:
					"Roughly how much has global plastic production grown since the 1950s?",
				choices: [
					"It's stayed flat",
					"Doubled",
					"Grown over 100-fold",
					"Shrunk",
				],
				correctIndex: 2,
				explanation:
					"Global plastic production has exploded from about 2 million tonnes in the 1950s to over 400 million tonnes a year today.",
			},
			{
				prompt:
					"What share of the food produced globally is estimated to go to waste?",
				choices: ["About 5%", "About 15%", "Roughly a third", "About 90%"],
				correctIndex: 2,
				explanation:
					"Roughly a third of food produced worldwide is lost or wasted, wasting the land, water, and energy that went into growing it.",
			},
			{
				prompt:
					"Which of these is the biggest driver of global biodiversity loss?",
				choices: [
					"Habitat loss from land-use change",
					"Noise pollution",
					"Space debris",
					"Ocean tides",
				],
				correctIndex: 0,
				explanation:
					"Converting natural habitat to farmland, cities, and infrastructure is the leading driver of biodiversity loss worldwide.",
			},
		],
	},
	{
		slug: "us-footprint-deep-dive",
		title: "The US Environmental Footprint",
		category: "awareness",
		questions: [
			{
				prompt:
					"About what share of US electricity generation still comes from fossil fuels?",
				choices: ["About 20%", "About 40%", "About 60%", "About 95%"],
				correctIndex: 2,
				explanation:
					"Roughly 60% of US electricity still comes from burning coal and natural gas, even as clean energy's share grows quickly.",
			},
			{
				prompt:
					"Which sector is the single largest source of direct US greenhouse gas emissions?",
				choices: [
					"Agriculture",
					"Transportation",
					"Residential heating",
					"Waste management",
				],
				correctIndex: 1,
				explanation:
					"Transportation is the largest direct source of US emissions, EPA reports — and over 94% of its fuel is still petroleum-based.",
			},
			{
				prompt:
					"Roughly how much CO2 does the US forestry and land sector remove from the atmosphere each year?",
				choices: [
					"None — forests add emissions",
					"Enough to offset about 13% of total US emissions",
					"Enough to offset all US emissions",
					"Enough to offset half of US emissions",
				],
				correctIndex: 1,
				explanation:
					"EPA estimates the land use, land-use change, and forestry sector offsets about 13% of total US greenhouse gas emissions annually.",
			},
			{
				prompt: "Since 1990, gross US greenhouse gas emissions have…",
				choices: [
					"Dropped by more than half",
					"Dropped just over 3%",
					"Roughly doubled",
					"Stayed exactly flat",
				],
				correctIndex: 1,
				explanation:
					"EPA reports gross US emissions are down just over 3% since 1990 — real but slow progress relative to climate goals.",
			},
			{
				prompt:
					"How does the average American's per-person emissions compare to the world average?",
				choices: [
					"About the same",
					"About half the world average",
					"Roughly 4x the world average",
					"Roughly 20x the world average",
				],
				correctIndex: 2,
				explanation:
					"At about 16 tons of CO2 per year, the average American emits roughly 4x the global per-capita average.",
			},
		],
	},
] as const;

async function seed() {
	for (const city of seedCities) {
		await db
			.insert(cities)
			.values(city)
			.onConflictDoUpdate({
				target: cities.slug,
				set: {
					name: city.name,
					country: city.country,
					lat: city.lat,
					lng: city.lng,
				},
			});
	}
	console.log(`seeded ${seedCities.length} cities`);

	const quizIdBySlug = new Map<string, number>();
	for (const quiz of seedQuizzes) {
		const [inserted] = await db
			.insert(quizzes)
			.values({ slug: quiz.slug, title: quiz.title, category: quiz.category })
			.onConflictDoUpdate({
				target: quizzes.slug,
				set: { title: quiz.title, category: quiz.category },
			})
			.returning();
		quizIdBySlug.set(quiz.slug, inserted.id);

		// re-seed questions idempotently: wipe and reinsert for this quiz
		await db.delete(questions).where(eq(questions.quizId, inserted.id));
		await db.insert(questions).values(
			quiz.questions.map((q) => ({
				quizId: inserted.id,
				prompt: q.prompt,
				choices: [...q.choices],
				correctIndex: q.correctIndex,
				explanation: q.explanation,
			})),
		);
		console.log(
			`seeded quiz: ${quiz.slug} (${quiz.questions.length} questions)`,
		);
	}

	await seedDemoActivity(quizIdBySlug);
	process.exit(0);
}

const demoUsers = [
	{
		id: "demo-ava-chen",
		name: "Ava Chen (demo)",
		email: "demo-ava-chen@ecoverse.demo",
		citySlug: "nyc",
		attempts: [
			{ quizSlug: "clean-energy-basics", score: 40 },
			{ quizSlug: "daily-footprint", score: 30 },
		],
	},
	{
		id: "demo-marcus-lee",
		name: "Marcus Lee (demo)",
		email: "demo-marcus-lee@ecoverse.demo",
		citySlug: "los-angeles",
		attempts: [
			{ quizSlug: "oceans-and-air", score: 50 },
			{ quizSlug: "us-footprint-deep-dive", score: 20 },
		],
	},
	{
		id: "demo-priya-patel",
		name: "Priya Patel (demo)",
		email: "demo-priya-patel@ecoverse.demo",
		citySlug: "orlando",
		attempts: [
			{ quizSlug: "clean-energy-basics", score: 50 },
			{ quizSlug: "greenhouse-gas-sources", score: 40 },
			{ quizSlug: "climate-effects", score: 30 },
		],
	},
	{
		id: "demo-noah-kim",
		name: "Noah Kim (demo)",
		email: "demo-noah-kim@ecoverse.demo",
		citySlug: "chicago",
		attempts: [{ quizSlug: "daily-footprint", score: 40 }],
	},
	{
		id: "demo-sofia-rossi",
		name: "Sofia Rossi (demo)",
		email: "demo-sofia-rossi@ecoverse.demo",
		citySlug: "london",
		attempts: [
			{ quizSlug: "climate-causes-global", score: 50 },
			{ quizSlug: "resource-consumption", score: 30 },
		],
	},
	{
		id: "demo-jamal-carter",
		name: "Jamal Carter (demo)",
		email: "demo-jamal-carter@ecoverse.demo",
		citySlug: "orlando",
		attempts: [
			{ quizSlug: "oceans-and-air", score: 30 },
			{ quizSlug: "daily-footprint", score: 20 },
		],
	},
] as const;

/** Placeholder accounts (name suffixed "(demo)", no login capability) so the leaderboard has activity to show. */
async function seedDemoActivity(quizIdBySlug: Map<string, number>) {
	for (const demo of demoUsers) {
		await db
			.insert(user)
			.values({ id: demo.id, name: demo.name, email: demo.email })
			.onConflictDoNothing({ target: user.id });

		const city = seedCities.find((c) => c.slug === demo.citySlug);
		if (city) {
			const [row] = await db
				.select({ id: cities.id })
				.from(cities)
				.where(eq(cities.slug, city.slug));
			if (row) {
				await db
					.insert(userCities)
					.values({ userId: demo.id, cityId: row.id })
					.onConflictDoUpdate({
						target: userCities.userId,
						set: { cityId: row.id },
					});
			}
		}

		for (const attempt of demo.attempts) {
			const quizId = quizIdBySlug.get(attempt.quizSlug);
			if (!quizId) continue;
			await db
				.insert(quizAttempts)
				.values({ userId: demo.id, quizId, score: attempt.score })
				.onConflictDoNothing({
					target: [quizAttempts.userId, quizAttempts.quizId],
				});
		}
	}
	console.log(`seeded ${demoUsers.length} demo users with quiz activity`);
}

seed().catch((err) => {
	console.error(err);
	process.exit(1);
});
