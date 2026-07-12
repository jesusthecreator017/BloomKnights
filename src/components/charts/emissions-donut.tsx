import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
	GlassCard,
	GlassCardContent,
	GlassCardDescription,
	GlassCardHeader,
	GlassCardTitle,
} from "#/components/ui/glass-card";
import type { EmissionsEntry } from "#/lib/api-types";
import { emissionsDonutData } from "#/lib/chart-data";
import { formatTonnesCo2e } from "#/lib/format";

const TOOLTIP_STYLE = {
	background: "rgba(15,23,42,0.95)",
	border: "1px solid rgba(255,255,255,0.15)",
	borderRadius: 12,
	color: "white",
};

export function EmissionsDonut({ entry }: { entry: EmissionsEntry }) {
	const data = emissionsDonutData(entry);

	return (
		<GlassCard glowEffect={false}>
			<GlassCardHeader>
				<GlassCardTitle>Gas breakdown</GlassCardTitle>
				<GlassCardDescription>By CO2-equivalent mass</GlassCardDescription>
			</GlassCardHeader>
			<GlassCardContent className="flex flex-col items-center gap-4 sm:flex-row">
				<div className="h-40 w-40 shrink-0">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie
								data={data}
								dataKey="value"
								nameKey="name"
								innerRadius={50}
								outerRadius={78}
								paddingAngle={2}
								strokeWidth={0}
							>
								{data.map((d) => (
									<Cell key={d.name} fill={d.color} />
								))}
							</Pie>
							<Tooltip
								contentStyle={TOOLTIP_STYLE}
								formatter={(value) => formatTonnesCo2e(Number(value))}
							/>
						</PieChart>
					</ResponsiveContainer>
				</div>
				<ul className="flex flex-1 flex-col gap-2 text-sm">
					{data.map((d) => (
						<li
							key={d.name}
							className="flex items-center justify-between gap-3"
						>
							<span className="flex items-center gap-2 text-white/80">
								<span
									className="h-2.5 w-2.5 shrink-0 rounded-full"
									style={{ backgroundColor: d.color }}
								/>
								{d.name}
							</span>
							<span className="font-medium text-white">
								{formatTonnesCo2e(d.value)}
							</span>
						</li>
					))}
				</ul>
			</GlassCardContent>
		</GlassCard>
	);
}
