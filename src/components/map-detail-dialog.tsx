import { CalendarDays, ExternalLink, HandHeart } from "lucide-react";
import { AskGeminiBox } from "#/components/ask-gemini-box";
import { GlassBadge } from "#/components/ui/glass-badge";
import { GlassButton } from "#/components/ui/glass-button";
import {
	GlassDialog,
	GlassDialogContent,
	GlassDialogHeader,
	GlassDialogTitle,
} from "#/components/ui/glass-dialog";
import type { EcoEvent, EcoInitiative, WeatherAlert } from "#/lib/api-types";

export type MapSelection =
	| { kind: "event"; data: EcoEvent }
	| { kind: "initiative"; data: EcoInitiative }
	| { kind: "alert"; data: WeatherAlert };

const SEVERITY_BADGE: Record<string, "destructive" | "outline"> = {
	Extreme: "destructive",
	Severe: "destructive",
};

/** Liquid-glass detail popup shared by events, initiatives, and weather alerts on the Map page. */
export function MapDetailDialog({
	selection,
	onClose,
}: {
	selection: MapSelection | null;
	onClose: () => void;
}) {
	return (
		<GlassDialog open={!!selection} onOpenChange={(open) => !open && onClose()}>
			<GlassDialogContent>
				{selection?.kind === "event" && <EventDetail event={selection.data} />}
				{selection?.kind === "initiative" && (
					<InitiativeDetail initiative={selection.data} />
				)}
				{selection?.kind === "alert" && <AlertDetail alert={selection.data} />}
			</GlassDialogContent>
		</GlassDialog>
	);
}

function EventDetail({ event }: { event: EcoEvent }) {
	return (
		<>
			<GlassDialogHeader>
				<div className="flex items-center gap-2">
					<GlassBadge>{event.category}</GlassBadge>
					<span className="flex items-center gap-1 text-white/60 text-xs">
						<CalendarDays className="h-3 w-3" />
						{event.date}
					</span>
				</div>
				<GlassDialogTitle className="mt-1">{event.name}</GlassDialogTitle>
			</GlassDialogHeader>
			<p className="mt-2 max-h-40 overflow-y-auto text-sm text-white/70 leading-relaxed">
				{event.description}
			</p>
			<p className="mt-2 text-white/50 text-xs">{event.city}</p>
			<div className="mt-4 flex flex-wrap gap-2">
				{event.volunteerUrl && (
					<a href={event.volunteerUrl} target="_blank" rel="noreferrer">
						<GlassButton variant="primary" size="sm">
							<HandHeart className="h-4 w-4" /> Volunteer
						</GlassButton>
					</a>
				)}
				<a href={event.url} target="_blank" rel="noreferrer">
					<GlassButton variant="outline" size="sm">
						<ExternalLink className="h-4 w-4" /> Visit website
					</GlassButton>
				</a>
			</div>
			<div className="mt-4">
				<AskGeminiBox
					context={{
						kind: "event",
						name: event.name,
						description: event.description,
						lat: event.lat,
						lng: event.lng,
					}}
				/>
			</div>
		</>
	);
}

function InitiativeDetail({ initiative }: { initiative: EcoInitiative }) {
	return (
		<>
			<GlassDialogHeader>
				<GlassBadge className="w-fit">{initiative.category}</GlassBadge>
				<GlassDialogTitle className="mt-1">{initiative.name}</GlassDialogTitle>
			</GlassDialogHeader>
			<p className="mt-2 max-h-40 overflow-y-auto text-sm text-white/70 leading-relaxed">
				{initiative.description}
			</p>
			<p className="mt-2 text-white/50 text-xs">{initiative.city}</p>
			<div className="mt-4 flex flex-wrap gap-2">
				{initiative.volunteerUrl && (
					<a href={initiative.volunteerUrl} target="_blank" rel="noreferrer">
						<GlassButton variant="primary" size="sm">
							<HandHeart className="h-4 w-4" /> Volunteer
						</GlassButton>
					</a>
				)}
				<a href={initiative.website} target="_blank" rel="noreferrer">
					<GlassButton variant="outline" size="sm">
						<ExternalLink className="h-4 w-4" /> Visit website
					</GlassButton>
				</a>
			</div>
			<div className="mt-4">
				<AskGeminiBox
					context={{
						kind: "initiative",
						name: initiative.name,
						description: initiative.description,
						lat: initiative.lat,
						lng: initiative.lng,
					}}
				/>
			</div>
		</>
	);
}

function AlertDetail({ alert }: { alert: WeatherAlert }) {
	return (
		<>
			<GlassDialogHeader>
				<GlassBadge
					variant={SEVERITY_BADGE[alert.severity] ?? "outline"}
					className="w-fit"
				>
					{alert.severity}
				</GlassBadge>
				<GlassDialogTitle className="mt-1">{alert.event}</GlassDialogTitle>
			</GlassDialogHeader>
			<p className="mt-2 text-sm text-white/70">{alert.headline}</p>
			<p className="mt-2 text-white/50 text-xs">{alert.areaDesc}</p>
			{alert.description && (
				<p className="mt-3 max-h-40 overflow-y-auto text-sm text-white/60 leading-relaxed">
					{alert.description}
				</p>
			)}
			<div className="mt-4 flex flex-wrap gap-2">
				<a href={alert.link} target="_blank" rel="noreferrer">
					<GlassButton variant="outline" size="sm">
						<ExternalLink className="h-4 w-4" /> View on weather.gov
					</GlassButton>
				</a>
			</div>
			<div className="mt-4">
				<AskGeminiBox
					context={{
						kind: "location",
						name: alert.event,
						description: `${alert.headline} ${alert.description}`.slice(0, 900),
						lat: alert.lat,
						lng: alert.lng,
					}}
				/>
			</div>
		</>
	);
}
