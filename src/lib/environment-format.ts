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

/** Linear green -> yellow -> red interpolation for a US AQI value, clamped at 150+. */
export function aqiColor(aqi: number): string {
	const stops: [number, [number, number, number]][] = [
		[0, [62, 189, 73]], // forest-400
		[75, [250, 204, 21]], // yellow-400
		[150, [239, 68, 68]], // red-500
	];
	const clamped = Math.max(0, Math.min(150, aqi));
	let lo = stops[0];
	let hi = stops[stops.length - 1];
	for (let i = 0; i < stops.length - 1; i++) {
		if (clamped >= stops[i][0] && clamped <= stops[i + 1][0]) {
			lo = stops[i];
			hi = stops[i + 1];
			break;
		}
	}
	const span = hi[0] - lo[0] || 1;
	const t = (clamped - lo[0]) / span;
	const [r, g, b] = lo[1].map((c, i) => Math.round(c + (hi[1][i] - c) * t));
	return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** NOAA Coral Reef Watch bleaching alert area, 0=none .. 4=alert level 2 */
export const CORAL_DOT: Record<number, string> = {
	0: "bg-forest-400",
	1: "bg-yellow-400",
	2: "bg-orange-400",
	3: "bg-red-400",
	4: "bg-red-600",
};
