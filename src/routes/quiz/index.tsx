import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ClipboardList } from "lucide-react";
import { GlassBadge } from "#/components/ui/glass-badge";
import {
	GlassCard,
	GlassCardContent,
	GlassCardDescription,
	GlassCardHeader,
	GlassCardTitle,
} from "#/components/ui/glass-card";
import { fetchJson } from "#/lib/api-client";
import type { QuizSummary } from "#/lib/api-types";

export const Route = createFileRoute("/quiz/")({ component: QuizListPage });

function QuizListPage() {
	const { data, isLoading, error } = useQuery({
		queryKey: ["quizzes"],
		queryFn: () => fetchJson<QuizSummary[]>("/api/quizzes"),
	});

	return (
		<div className="mx-auto max-w-3xl px-4 py-16">
			<div className="flex items-center gap-2">
				<ClipboardList className="h-6 w-6 text-forest-400" />
				<h1 className="text-3xl font-bold">Test your knowledge</h1>
			</div>
			<p className="mt-2 text-white/70">
				Quick quizzes on clean energy, footprints, and ecosystems. Earn points
				and climb the leaderboard.
			</p>

			{isLoading && <p className="mt-8 text-white/50">Loading quizzes…</p>}
			{error && (
				<p className="mt-8 text-red-300">Couldn't load quizzes right now.</p>
			)}

			<div className="mt-8 grid gap-4 sm:grid-cols-2">
				{data?.map((quiz) => (
					<Link key={quiz.slug} to="/quiz/$slug" params={{ slug: quiz.slug }}>
						<GlassCard className="h-full transition hover:-translate-y-0.5">
							<GlassCardHeader>
								<GlassBadge variant="outline" className="w-fit capitalize">
									{quiz.category}
								</GlassBadge>
								<GlassCardTitle className="mt-2">{quiz.title}</GlassCardTitle>
								<GlassCardDescription>
									{quiz.questionCount} questions · {quiz.totalPoints} pts
								</GlassCardDescription>
							</GlassCardHeader>
							<GlassCardContent>
								<span className="inline-flex items-center gap-1 text-sm font-medium text-forest-400">
									Start quiz <ArrowRight className="h-4 w-4" />
								</span>
							</GlassCardContent>
						</GlassCard>
					</Link>
				))}
			</div>
		</div>
	);
}
