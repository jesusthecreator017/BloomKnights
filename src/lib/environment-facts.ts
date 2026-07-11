/**
 * Curated facts from EPA / UN (and well-established figures where the source
 * page blocked automated fetches) — shared by the seeded quizzes and injected
 * as grounding context for Gemini-generated quizzes so AI questions stay
 * anchored to real data instead of drifting.
 */
export const ENVIRONMENT_FACTS: readonly string[] = [
	"US total 2022 greenhouse gas emissions: 6,343.2 million metric tons of CO2 equivalent (EPA).",
	"Gross US greenhouse gas emissions are down just over 3% since 1990 (EPA).",
	"Buildings use about 75% of all electricity generated in the US (EPA).",
	"Over 94% of US transportation fuel is still petroleum-based (EPA).",
	"US land use, land-use change, and forestry offsets about 13% of total US greenhouse gas emissions annually (EPA).",
	"Roughly 60% of US electricity generation still comes from fossil fuels.",
	"Fossil fuels (coal, oil, gas) account for about 68% of global greenhouse gas emissions (UN).",
	"Nearly 90% of all human CO2 emissions come from fossil fuels (UN).",
	"About a third of global electricity still comes from burning coal, oil, or gas (UN).",
	"Buildings consume nearly 60% of all electricity generated worldwide (UN).",
	"Transportation causes nearly a quarter of global energy-related CO2 emissions (UN).",
	"The 20 largest economies (G20) account for almost 80% of global greenhouse gas emissions (UN).",
	"2015-2024 is the warmest decade on record (UN).",
	"Arctic temperatures are warming at least twice as fast as the global average (UN).",
	"Species are going extinct at roughly 1,000 times the natural background rate; about one million species are at risk (UN).",
	"An estimated 45.8 million people were displaced by weather-related disasters in 2024 (UN).",
	"Roughly 13 million deaths per year are linked to environmental factors, including air pollution (UN).",
	"Global material extraction (minerals, fossil fuels, biomass) has roughly tripled since 1970.",
	"People in high-income countries consume several times more raw materials per person than those in low-income countries.",
	"Global plastic production has grown from about 2 million tonnes in the 1950s to over 400 million tonnes a year today.",
	"Roughly a third of all food produced globally is lost or wasted.",
	"Habitat loss from land-use change is the leading driver of global biodiversity loss.",
	"The average American emits about 16 tons of CO2 per year, roughly 4x the global per-capita average.",
	"Beef produces about 60 kg of CO2-equivalent per kg — roughly 10x chicken and 30x beans.",
	"Burning one gallon of gasoline releases about 8.9 kg of CO2.",
	"The average American produces about 2.2 kg of trash per day; less than a third is recycled or composted.",
	"Utility-scale solar is now the cheapest new electricity to build in most of the world (IEA) — costs fell about 90% since 2010.",
	"Heat pumps move heat rather than generate it, making them 3-4x more efficient than furnaces or resistance heating.",
	"Oceans absorb roughly a quarter of human CO2 emissions, which also acidifies the water.",
	"Coral bleaching is caused by prolonged heat stress in ocean water (NOAA Coral Reef Watch).",
];
