import {
	Bar,
	BarChart,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	GlassCard,
	GlassCardContent,
	GlassCardDescription,
	GlassCardHeader,
	GlassCardTitle,
} from "#/components/ui/glass-card";
import type { EmissionsEntry } from "#/lib/api-types";
import { emissionsBarData } from "#/lib/chart-data";
import { formatTonnesCo2e } from "#/lib/format";

const TOOLTIP_STYLE = {
	background: "rgba(15,23,42,0.95)",
	border: "1px solid rgba(255,255,255,0.15)",
	borderRadius: 12,
	color: "white",
};

export function EmissionsBarChart({
	entry,
	countryName,
}: {
	entry: EmissionsEntry;
	countryName: string;
}) {
	const data = emissionsBarData(entry, countryName);

	return (
		<GlassCard>
			<GlassCardHeader>
				<GlassCardTitle>{countryName} vs. the world</GlassCardTitle>
				<GlassCardDescription>
					Annual CO2-equivalent emissions (100-year basis)
				</GlassCardDescription>
			</GlassCardHeader>
			<GlassCardContent>
				<div className="h-40">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={data}
							layout="vertical"
							margin={{ left: 8, right: 24 }}
						>
							<XAxis type="number" hide />
							<YAxis
								type="category"
								dataKey="label"
								width={110}
								tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
								axisLine={false}
								tickLine={false}
							/>
							<Tooltip
								cursor={{ fill: "rgba(255,255,255,0.06)" }}
								contentStyle={TOOLTIP_STYLE}
								formatter={(value) => formatTonnesCo2e(Number(value))}
							/>
							<Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
								{data.map((d) => (
									<Cell key={d.label} fill={d.color} />
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</GlassCardContent>
		</GlassCard>
	);
}
