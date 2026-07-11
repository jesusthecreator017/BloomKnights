export function aqiLevel(aqi: number): { label: string; className: string } {
	if (aqi <= 50) return { label: "Good", className: "text-forest-400" };
	if (aqi <= 100) return { label: "Moderate", className: "text-yellow-400" };
	if (aqi <= 150)
		return { label: "Unhealthy (sensitive)", className: "text-orange-400" };
	if (aqi <= 200) return { label: "Unhealthy", className: "text-red-400" };
	if (aqi <= 300)
		return { label: "Very Unhealthy", className: "text-purple-400" };
	return { label: "Hazardous", className: "text-rose-500" };
}

/** NOAA Coral Reef Watch bleaching alert area, 0=none .. 4=alert level 2 */
export const CORAL_DOT: Record<number, string> = {
	0: "bg-forest-400",
	1: "bg-yellow-400",
	2: "bg-orange-400",
	3: "bg-red-400",
	4: "bg-red-600",
};
