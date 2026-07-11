import rawInitiatives from "../data/initiatives.json";

export interface EcoInitiative {
	id: string;
	name: string;
	description: string;
	category: string;
	lat: number;
	lng: number;
	city: string;
	website: string;
	volunteerUrl?: string;
}

export const initiatives: Array<EcoInitiative> = rawInitiatives;
