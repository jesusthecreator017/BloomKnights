/** Converts a 2-letter ISO 3166-1 country code into its flag emoji via regional indicator symbols. */
export function flagEmoji(iso2: string): string {
	return iso2
		.toUpperCase()
		.replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

/** city.country strings as seeded in the DB -> ISO-2, for leaderboard flags. */
export const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
	USA: "US",
	"United Kingdom": "GB",
	Japan: "JP",
	France: "FR",
	Germany: "DE",
	Canada: "CA",
	Australia: "AU",
	Singapore: "SG",
	Netherlands: "NL",
	Sweden: "SE",
	"United Arab Emirates": "AE",
	Mexico: "MX",
	Brazil: "BR",
};

export function countryFlag(countryName: string): string | null {
	const iso2 = COUNTRY_NAME_TO_ISO2[countryName];
	return iso2 ? flagEmoji(iso2) : null;
}

/** ISO-3 codes accepted by the Climate TRACE emissions endpoint (GET /api/emissions?country=). */
export const EMISSIONS_COUNTRIES: {
	iso3: string;
	iso2: string;
	name: string;
}[] = [
	{ iso3: "USA", iso2: "US", name: "United States" },
	{ iso3: "CHN", iso2: "CN", name: "China" },
	{ iso3: "IND", iso2: "IN", name: "India" },
	{ iso3: "RUS", iso2: "RU", name: "Russia" },
	{ iso3: "JPN", iso2: "JP", name: "Japan" },
	{ iso3: "DEU", iso2: "DE", name: "Germany" },
	{ iso3: "GBR", iso2: "GB", name: "United Kingdom" },
	{ iso3: "BRA", iso2: "BR", name: "Brazil" },
	{ iso3: "CAN", iso2: "CA", name: "Canada" },
	{ iso3: "AUS", iso2: "AU", name: "Australia" },
	{ iso3: "MEX", iso2: "MX", name: "Mexico" },
	{ iso3: "FRA", iso2: "FR", name: "France" },
	{ iso3: "ESP", iso2: "ES", name: "Spain" },
	{ iso3: "NGA", iso2: "NG", name: "Nigeria" },
	{ iso3: "PHL", iso2: "PH", name: "Philippines" },
	{ iso3: "KOR", iso2: "KR", name: "South Korea" },
	{ iso3: "IDN", iso2: "ID", name: "Indonesia" },
	{ iso3: "SAU", iso2: "SA", name: "Saudi Arabia" },
	{ iso3: "ZAF", iso2: "ZA", name: "South Africa" },
	{ iso3: "ARG", iso2: "AR", name: "Argentina" },
];
