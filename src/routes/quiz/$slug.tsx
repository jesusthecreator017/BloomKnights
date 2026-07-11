import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, Trophy, X } from "lucide-react";
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
import type {
	CheckAnswerResponse,
	QuizDetail,
	QuizQuestion,
	QuizSubmitResult,
} from "#/lib/api-types";
import { formatCategory } from "#/lib/format";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/quiz/$slug")({
	component: QuizPlayPage,
});

function QuizPlayPage() {
	const { slug } = Route.useParams();
	const queryClient = useQueryClient();

	const [currentIndex, setCurrentIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<number, number>>({});
	const [feedback, setFeedback] = useState<Record<number, CheckAnswerResponse>>(
		{},
	);
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

	const check = useMutation({
		mutationFn: (vars: { questionId: number; answer: number }) =>
			fetchJson<CheckAnswerResponse>(`/api/quizzes/${slug}/check`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(vars),
			}),
		onSuccess: (data, vars) => {
			setFeedback((prev) => ({ ...prev, [vars.questionId]: data }));
		},
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
			<p className="mx-auto max-w-2xl px-4 py-10 sm:py-16 text-muted-foreground">
				Loading quiz…
			</p>
		);
	}

	if (error || !quiz) {
		return (
			<div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
				<p className="text-red-400">
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
			<div className="mx-auto max-w-2xl px-4 py-10 sm:py-16 text-center">
				<Trophy className="mx-auto h-10 w-10 text-forest-400" />
				<h1 className="mt-4 text-2xl font-bold">
					You've already completed this quiz
				</h1>
				<p className="mt-2 text-muted-foreground">
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

	const answeredCount = Object.keys(feedback).length;
	const progress = (answeredCount / quiz.questions.length) * 100;
	const question = quiz.questions[currentIndex];
	const questionFeedback = feedback[question.id];
	const selected = answers[question.id];
	const isLast = currentIndex === quiz.questions.length - 1;

	function selectChoice(q: QuizQuestion, choiceIndex: number) {
		if (feedback[q.id]) return; // locked in once checked
		setAnswers((prev) => ({ ...prev, [q.id]: choiceIndex }));
		check.mutate({ questionId: q.id, answer: choiceIndex });
	}

	return (
		<div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
			<h1 className="text-3xl font-bold">{quiz.title}</h1>
			<p className="mt-1 text-sm text-muted-foreground">
				{formatCategory(quiz.category)}
			</p>

			<div className="mt-6">
				<GlassProgress value={progress} />
				<p className="mt-2 text-xs text-muted-foreground">
					Question {currentIndex + 1} of {quiz.questions.length} ·{" "}
					{answeredCount} answered
				</p>
			</div>

			<GlassCard key={question.id} glowEffect={false} className="mt-6">
				<GlassCardHeader>
					<GlassCardTitle className="text-base">
						{currentIndex + 1}. {question.prompt}
					</GlassCardTitle>
				</GlassCardHeader>
				<GlassCardContent className="flex flex-col gap-2">
					{question.choices.map((choice, choiceIndex) => {
						const isSelected = selected === choiceIndex;
						const isCorrectChoice =
							questionFeedback && choiceIndex === questionFeedback.correctIndex;
						const isWrongSelected =
							questionFeedback && isSelected && !questionFeedback.correct;

						return (
							<label
								key={choice}
								className={cn(
									"flex cursor-pointer items-center gap-3 rounded-xl border border-white/15 px-4 py-2.5 text-sm transition",
									!questionFeedback &&
										isSelected &&
										"border-forest-400/60 bg-forest-500/15",
									!questionFeedback && "hover:bg-white/5",
									questionFeedback && isCorrectChoice
										? "border-forest-400/60 bg-forest-500/15"
										: "",
									isWrongSelected && "border-red-400/60 bg-red-500/15",
									questionFeedback && "cursor-default",
								)}
							>
								<input
									type="radio"
									name={`question-${question.id}`}
									className="accent-forest-500"
									checked={isSelected}
									disabled={!!questionFeedback}
									onChange={() => selectChoice(question, choiceIndex)}
								/>
								{choice}
								{questionFeedback && isCorrectChoice && (
									<Check className="ml-auto h-4 w-4 shrink-0 text-forest-400" />
								)}
								{isWrongSelected && (
									<X className="ml-auto h-4 w-4 shrink-0 text-red-400" />
								)}
							</label>
						);
					})}

					{questionFeedback && (
						<div
							className={cn(
								"mt-2 rounded-xl border px-4 py-3 text-sm",
								questionFeedback.correct
									? "border-forest-400/30 bg-forest-500/10 text-forest-200"
									: "border-red-400/30 bg-red-500/10 text-red-200",
							)}
						>
							<p className="font-medium">
								{questionFeedback.correct ? "Correct!" : "Not quite."}
							</p>
							<p className="mt-1 text-white/70">
								{questionFeedback.explanation}
							</p>
						</div>
					)}
				</GlassCardContent>
			</GlassCard>

			<div className="mt-6 flex items-center justify-between gap-3">
				<GlassButton
					variant="outline"
					disabled={currentIndex === 0}
					onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
				>
					<ChevronLeft className="h-4 w-4" /> Back
				</GlassButton>

				{isLast ? (
					<GlassButton
						variant="primary"
						disabled={!questionFeedback || submit.isPending}
						onClick={() => submit.mutate()}
					>
						{submit.isPending ? "Submitting…" : "Finish quiz"}
					</GlassButton>
				) : (
					<GlassButton
						variant="primary"
						disabled={!questionFeedback}
						onClick={() =>
							setCurrentIndex((i) => Math.min(quiz.questions.length - 1, i + 1))
						}
					>
						Next <ChevronRight className="h-4 w-4" />
					</GlassButton>
				)}
			</div>

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
		<div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
			<div className="text-center">
				<Trophy className="mx-auto h-10 w-10 text-forest-400" />
				<h1 className="mt-4 text-3xl font-bold">
					{result.score} / {result.maxScore} points
				</h1>
				<p className="mt-1 text-muted-foreground">on {quiz.title}</p>
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
