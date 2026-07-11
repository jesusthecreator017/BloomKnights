import rawEvents from "../data/events.json";

export interface EcoEvent {
	id: string;
	name: string;
	description: string;
	category: string;
	date: string;
	lat: number;
	lng: number;
	city: string;
	url: string;
	volunteerUrl?: string;
}

export const events: Array<EcoEvent> = rawEvents;
