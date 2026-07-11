import { db } from "./index";
import { questions, quizzes } from "./schema";

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
		],
	},
];

async function seed() {
	for (const quiz of seedQuizzes) {
		const [inserted] = await db
			.insert(quizzes)
			.values({ slug: quiz.slug, title: quiz.title, category: quiz.category })
			.onConflictDoUpdate({
				target: quizzes.slug,
				set: { title: quiz.title, category: quiz.category },
			})
			.returning();

		// re-seed questions idempotently: wipe and reinsert for this quiz
		const { eq } = await import("drizzle-orm");
		await db.delete(questions).where(eq(questions.quizId, inserted.id));
		await db.insert(questions).values(
			quiz.questions.map((q) => ({
				quizId: inserted.id,
				prompt: q.prompt,
				choices: q.choices,
				correctIndex: q.correctIndex,
				explanation: q.explanation,
			})),
		);
		console.log(
			`seeded quiz: ${quiz.slug} (${quiz.questions.length} questions)`,
		);
	}
	process.exit(0);
}

seed().catch((err) => {
	console.error(err);
	process.exit(1);
});
