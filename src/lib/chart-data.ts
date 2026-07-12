import type { CityScore, EmissionsEntry } from "./api-types";
import { aqiColor } from "./environment-format";

export interface EmissionsBarDatum {
	label: string;
	value: number;
	color: string;
}

/** Fixed-order 2-slot categorical set: subject country then rest of world. */
export function emissionsBarData(
	entry: EmissionsEntry,
	countryLabel: string,
): EmissionsBarDatum[] {
	const rest = Math.max(
		0,
		entry.worldEmissions.co2e_100yr - entry.emissions.co2e_100yr,
	);
	return [
		{
			label: countryLabel,
			value: entry.emissions.co2e_100yr,
			color: "#1c9920",
		},
		{ label: "Rest of world", value: rest, color: "#3d76d1" },
	];
}

export interface EmissionsDonutDatum {
	name: string;
	value: number;
	color: string;
}

/** Fixed-order 3-slot categorical set: CO2, CH4, N2O. */
export function emissionsDonutData(
	entry: EmissionsEntry,
): EmissionsDonutDatum[] {
	return [
		{ name: "CO2", value: entry.emissions.co2, color: "#1c9920" },
		{ name: "CH4", value: entry.emissions.ch4, color: "#3d76d1" },
		{ name: "N2O", value: entry.emissions.n2o, color: "#c2790c" },
	];
}

export interface CityAqiDatum {
	name: string;
	aqi: number;
	color: string;
}

/** Color is by magnitude (aqiColor gradient), not category identity. */
export function cityAqiChartData(scores: CityScore[]): CityAqiDatum[] {
	return scores.map((s) => ({
		name: s.name,
		aqi: s.aqi,
		color: aqiColor(s.aqi),
	}));
}
