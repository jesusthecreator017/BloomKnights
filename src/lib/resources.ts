import rawResources from "../data/resources.json";

export type ResourceCategory =
	| "carbon"
	| "energy"
	| "ocean"
	| "waste"
	| "biodiversity"
	| "food"
	| "air-quality";

export type ResourceType = "action" | "article" | "org" | "data";

export interface Resource {
	id: string;
	category: ResourceCategory;
	type: ResourceType;
	title: string;
	description: string;
	url: string;
	impact?: string;
}

export const resources: Resource[] = rawResources as Resource[];

export const CATEGORIES: { id: ResourceCategory; label: string }[] = [
	{ id: "carbon", label: "Carbon & Emissions" },
	{ id: "energy", label: "Energy" },
	{ id: "ocean", label: "Ocean & Water" },
	{ id: "waste", label: "Waste & Recycling" },
	{ id: "biodiversity", label: "Biodiversity & Land" },
	{ id: "food", label: "Food" },
	{ id: "air-quality", label: "Air Quality" },
];

export function resourcesByCategory(
	category: ResourceCategory | "all",
): Resource[] {
	if (category === "all") return resources;
	return resources.filter((r) => r.category === category);
}
