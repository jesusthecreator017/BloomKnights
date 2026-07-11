export function formatTonnesCo2e(value: number): string {
	if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B t`;
	if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M t`;
	if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K t`;
	return `${Math.round(value).toLocaleString()} t`;
}

/** "ai-generated" -> "AI Generated", "clean-energy" -> "Clean Energy". */
export function formatCategory(category: string): string {
	return category
		.split("-")
		.map((word) =>
			word === "ai" ? "AI" : word.charAt(0).toUpperCase() + word.slice(1),
		)
		.join(" ");
}
