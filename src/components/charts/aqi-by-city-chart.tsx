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
import type { CityScore } from "#/lib/api-types";
import { cityAqiChartData } from "#/lib/chart-data";

const TOOLTIP_STYLE = {
	background: "rgba(15,23,42,0.95)",
	border: "1px solid rgba(255,255,255,0.15)",
	borderRadius: 12,
	color: "white",
};

export function AqiByCityChart({ scores }: { scores: CityScore[] }) {
	const data = cityAqiChartData(scores);

	return (
		<GlassCard glowEffect={false}>
			<GlassCardHeader>
				<GlassCardTitle>Live air quality by city</GlassCardTitle>
				<GlassCardDescription>
					US AQI at each Ecoverse city's center — lower is cleaner
				</GlassCardDescription>
			</GlassCardHeader>
			<GlassCardContent>
				<div style={{ height: Math.max(240, data.length * 28) }}>
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={data}
							layout="vertical"
							margin={{ left: 8, right: 24 }}
						>
							<XAxis type="number" hide />
							<YAxis
								type="category"
								dataKey="name"
								width={110}
								tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
								axisLine={false}
								tickLine={false}
							/>
							<Tooltip
								cursor={{ fill: "rgba(255,255,255,0.06)" }}
								contentStyle={TOOLTIP_STYLE}
								formatter={(value) => [`${value} US AQI`, ""]}
							/>
							<Bar dataKey="aqi" radius={[0, 4, 4, 0]} barSize={16}>
								{data.map((d) => (
									<Cell key={d.name} fill={d.color} />
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</GlassCardContent>
		</GlassCard>
	);
}
