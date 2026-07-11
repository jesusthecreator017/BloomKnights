export function formatTonnesCo2e(value: number): string {
	if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B t`;
	if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M t`;
	if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K t`;
	return `${Math.round(value).toLocaleString()} t`;
}
