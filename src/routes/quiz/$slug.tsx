import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Trophy, X } from "lucide-react";
import { useState } from "react";
import { GlassButton } from "#/components/ui/glass-button";
import {
	GlassCard,
	GlassCardContent,
	GlassCardHeader,
	GlassCardTitle,
} from "#/components/ui/glass-card";
import {
	GlassDialog,
	GlassDialogContent,
	GlassDialogDescription,
	GlassDialogFooter,
	GlassDialogHeader,
	GlassDialogTitle,
} from "#/components/ui/glass-dialog";
import { GlassProgress } from "#/components/ui/glass-progress";
import { leaderboardQueryKey } from "#/hooks/use-leaderboard";
import { ApiClientError, fetchJson } from "#/lib/api-client";
import type { QuizDetail, QuizSubmitResult } from "#/lib/api-types";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/quiz/$slug")({
	component: QuizPlayPage,
});

function QuizPlayPage() {
	const { slug } = Route.useParams();
	const queryClient = useQueryClient();

	const [answers, setAnswers] = useState<Record<number, number>>({});
	const [result, setResult] = useState<QuizSubmitResult | null>(null);
	const [alreadyDone, setAlreadyDone] = useState(false);
	const [showSignInDialog, setShowSignInDialog] = useState(false);

	const {
		data: quiz,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["quiz", slug],
		queryFn: () => fetchJson<QuizDetail>(`/api/quizzes/${slug}`),
	});

	const submit = useMutation({
		mutationFn: () => {
			if (!quiz) throw new Error("quiz not loaded");
			return fetchJson<QuizSubmitResult>(`/api/quizzes/${slug}/submit`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					answers: quiz.questions.map((q) => answers[q.id] ?? -1),
				}),
			});
		},
		onSuccess: (data) => {
			setResult(data);
			queryClient.invalidateQueries({ queryKey: leaderboardQueryKey(1) });
			queryClient.invalidateQueries({ queryKey: leaderboardQueryKey(20) });
		},
		onError: (err) => {
			if (err instanceof ApiClientError && err.status === 401) {
				setShowSignInDialog(true);
				return;
			}
			if (err instanceof ApiClientError && err.status === 409) {
				setAlreadyDone(true);
			}
		},
	});

	if (isLoading) {
		return (
			<p className="mx-auto max-w-2xl px-4 py-16 text-white/50">
				Loading quiz…
			</p>
		);
	}

	if (error || !quiz) {
		return (
			<div className="mx-auto max-w-2xl px-4 py-16">
				<p className="text-red-300">
					{error instanceof ApiClientError && error.status === 404
						? "That quiz doesn't exist."
						: "Couldn't load this quiz right now."}
				</p>
				<Link
					to="/quiz"
					className="mt-4 inline-block text-forest-400 hover:underline"
				>
					Back to quizzes
				</Link>
			</div>
		);
	}

	if (alreadyDone) {
		return (
			<div className="mx-auto max-w-2xl px-4 py-16 text-center">
				<Trophy className="mx-auto h-10 w-10 text-forest-400" />
				<h1 className="mt-4 text-2xl font-bold">
					You've already completed this quiz
				</h1>
				<p className="mt-2 text-white/60">
					One attempt per quiz — check your standing on the leaderboard.
				</p>
				<Link to="/leaderboard">
					<GlassButton variant="primary" className="mt-6">
						View leaderboard
					</GlassButton>
				</Link>
			</div>
		);
	}

	if (result) {
		return <ResultsView quiz={quiz} result={result} />;
	}

	const answeredCount = Object.keys(answers).length;
	const progress = (answeredCount / quiz.questions.length) * 100;
	const allAnswered = answeredCount === quiz.questions.length;

	return (
		<div className="mx-auto max-w-2xl px-4 py-16">
			<h1 className="text-3xl font-bold">{quiz.title}</h1>
			<p className="mt-1 text-sm text-white/50 capitalize">{quiz.category}</p>

			<div className="mt-6">
				<GlassProgress value={progress} />
				<p className="mt-2 text-xs text-white/50">
					{answeredCount} / {quiz.questions.length} answered
				</p>
			</div>

			<div className="mt-6 flex flex-col gap-4">
				{quiz.questions.map((q, i) => (
					<GlassCard key={q.id} glowEffect={false}>
						<GlassCardHeader>
							<GlassCardTitle className="text-base">
								{i + 1}. {q.prompt}
							</GlassCardTitle>
						</GlassCardHeader>
						<GlassCardContent className="flex flex-col gap-2">
							{q.choices.map((choice, choiceIndex) => (
								<label
									key={choice}
									className={cn(
										"flex cursor-pointer items-center gap-3 rounded-xl border border-white/15 px-4 py-2.5 text-sm transition",
										answers[q.id] === choiceIndex
											? "border-forest-400/60 bg-forest-500/15"
											: "hover:bg-white/5",
									)}
								>
									<input
										type="radio"
										name={`question-${q.id}`}
										className="accent-forest-500"
										checked={answers[q.id] === choiceIndex}
										onChange={() =>
											setAnswers((prev) => ({ ...prev, [q.id]: choiceIndex }))
										}
									/>
									{choice}
								</label>
							))}
						</GlassCardContent>
					</GlassCard>
				))}
			</div>

			<GlassButton
				variant="primary"
				size="lg"
				className="mt-6 w-full"
				disabled={!allAnswered || submit.isPending}
				onClick={() => submit.mutate()}
			>
				{submit.isPending ? "Submitting…" : "Submit answers"}
			</GlassButton>

			<GlassDialog open={showSignInDialog} onOpenChange={setShowSignInDialog}>
				<GlassDialogContent>
					<GlassDialogHeader>
						<GlassDialogTitle>Sign in to submit</GlassDialogTitle>
						<GlassDialogDescription>
							Your answers are graded server-side and points only count toward
							the leaderboard once you're signed in.
						</GlassDialogDescription>
					</GlassDialogHeader>
					<GlassDialogFooter>
						<GlassButton
							variant="outline"
							onClick={() => setShowSignInDialog(false)}
						>
							Not now
						</GlassButton>
						<Link to="/login">
							<GlassButton variant="primary">Sign in</GlassButton>
						</Link>
					</GlassDialogFooter>
				</GlassDialogContent>
			</GlassDialog>
		</div>
	);
}

function ResultsView({
	quiz,
	result,
}: {
	quiz: QuizDetail;
	result: QuizSubmitResult;
}) {
	return (
		<div className="mx-auto max-w-2xl px-4 py-16">
			<div className="text-center">
				<Trophy className="mx-auto h-10 w-10 text-forest-400" />
				<h1 className="mt-4 text-3xl font-bold">
					{result.score} / {result.maxScore} points
				</h1>
				<p className="mt-1 text-white/60">on {quiz.title}</p>
				<Link to="/leaderboard">
					<GlassButton variant="primary" className="mt-4">
						View leaderboard
					</GlassButton>
				</Link>
			</div>

			<div className="mt-8 flex flex-col gap-4">
				{result.results.map((r, i) => {
					const question = quiz.questions.find((q) => q.id === r.questionId);
					if (!question) return null;
					return (
						<GlassCard key={r.questionId} glowEffect={false}>
							<GlassCardHeader>
								<div className="flex items-start gap-2">
									{r.correct ? (
										<Check className="mt-0.5 h-5 w-5 shrink-0 text-forest-400" />
									) : (
										<X className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
									)}
									<GlassCardTitle className="text-base">
										{i + 1}. {question.prompt}
									</GlassCardTitle>
								</div>
							</GlassCardHeader>
							<GlassCardContent className="flex flex-col gap-2">
								<p className="text-sm text-white/70">
									Correct answer:{" "}
									<span className="font-medium text-forest-400">
										{question.choices[r.correctIndex]}
									</span>
								</p>
								{!r.correct && r.yourAnswer != null && (
									<p className="text-sm text-white/50">
										Your answer:{" "}
										<span className="text-red-300">
											{question.choices[r.yourAnswer]}
										</span>
									</p>
								)}
								<p className="mt-1 text-sm text-white/60">{r.explanation}</p>
							</GlassCardContent>
						</GlassCard>
					);
				})}
			</div>
		</div>
	);
}
