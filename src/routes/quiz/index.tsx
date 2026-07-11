import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ClipboardList, Shuffle, Sparkles } from "lucide-react";
import { useState } from "react";
import { GlassBadge } from "#/components/ui/glass-badge";
import { GlassButton } from "#/components/ui/glass-button";
import {
	GlassCard,
	GlassCardContent,
	GlassCardDescription,
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
import { GlassInput } from "#/components/ui/glass-input";
import { ApiClientError, fetchJson } from "#/lib/api-client";
import type { QuizDetail, QuizSummary } from "#/lib/api-types";
import { formatCategory } from "#/lib/format";

export const Route = createFileRoute("/quiz/")({ component: QuizListPage });

function QuizListPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const { data, isLoading, error } = useQuery({
		queryKey: ["quizzes"],
		queryFn: () => fetchJson<QuizSummary[]>("/api/quizzes"),
		retry: (count) => count < 2,
	});

	const [showSignInDialog, setShowSignInDialog] = useState(false);
	const [showTopicDialog, setShowTopicDialog] = useState(false);
	const [topic, setTopic] = useState("");
	const [generateError, setGenerateError] = useState<string | null>(null);

	const generate = useMutation({
		mutationFn: (body: { topic?: string }) =>
			fetchJson<QuizDetail>("/api/quizzes/generate", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			}),
		onSuccess: (quiz) => {
			queryClient.invalidateQueries({ queryKey: ["quizzes"] });
			setShowTopicDialog(false);
			setTopic("");
			navigate({ to: "/quiz/$slug", params: { slug: quiz.slug } });
		},
		onError: (err) => {
			if (err instanceof ApiClientError) {
				if (err.status === 401) {
					setShowSignInDialog(true);
					return;
				}
				if (err.status === 429) {
					setGenerateError(
						"You're generating quizzes fast — slow down and try again shortly.",
					);
					return;
				}
				if (err.status === 500) {
					setGenerateError(
						"AI quiz generation isn't set up yet (missing GEMINI_API_KEY).",
					);
					return;
				}
				setGenerateError(
					"Gemini couldn't generate a quiz right now — try again.",
				);
				return;
			}
			setGenerateError("Something went wrong generating that quiz.");
		},
	});

	const standard = data?.filter((q) => !q.createdBy) ?? [];
	const generated = data?.filter((q) => q.createdBy) ?? [];
	const recentGenerated = [...generated].reverse().slice(0, 12);

	function reshuffle() {
		setGenerateError(null);
		generate.mutate({});
	}

	function askGemini() {
		setGenerateError(null);
		generate.mutate({ topic: topic.trim() });
	}

	return (
		<div className="mx-auto max-w-3xl px-4 py-16">
			<div className="flex items-center gap-2">
				<ClipboardList className="h-6 w-6 text-forest-400" />
				<h1 className="text-3xl font-bold">Test your knowledge</h1>
			</div>
			<p className="mt-2 text-muted-foreground">
				Quick quizzes on clean energy, footprints, and ecosystems. Earn points
				and climb the leaderboard.
			</p>

			{isLoading && (
				<p className="mt-8 text-muted-foreground">Loading quizzes…</p>
			)}
			{error && (
				<p className="mt-8 text-red-400">Couldn't load quizzes right now.</p>
			)}

			<div className="mt-8 flex flex-wrap items-center justify-between gap-3">
				<h2 className="text-lg font-semibold text-foreground/90">
					AI-Generated
				</h2>
				<div className="flex gap-2">
					<GlassButton
						variant="outline"
						size="sm"
						className="border-foreground/40 text-foreground hover:border-foreground/60 hover:bg-foreground/10"
						disabled={generate.isPending}
						onClick={reshuffle}
					>
						<Shuffle className="h-4 w-4" /> Reshuffle
					</GlassButton>
					<GlassButton
						variant="primary"
						size="sm"
						disabled={generate.isPending}
						onClick={() => {
							setGenerateError(null);
							setShowTopicDialog(true);
						}}
					>
						<Sparkles className="h-4 w-4" /> Ask Gemini
					</GlassButton>
				</div>
			</div>

			{generate.isPending && (
				<p className="mt-3 text-sm text-muted-foreground">
					Generating your quiz… this can take a few seconds.
				</p>
			)}
			{generateError && !generate.isPending && (
				<p className="mt-3 text-sm text-red-400">{generateError}</p>
			)}

			<div className="mt-4 grid gap-4 sm:grid-cols-2">
				{recentGenerated.length === 0 ? (
					<p className="text-sm text-muted-foreground sm:col-span-2">
						No AI quizzes yet — hit Reshuffle or ask Gemini for one about
						anything.
					</p>
				) : (
					recentGenerated.map((quiz) => (
						<QuizCard key={quiz.slug} quiz={quiz} badge="AI" />
					))
				)}
			</div>

			<h2 className="mt-12 text-lg font-semibold text-foreground/90">
				Standard Quizzes
			</h2>
			<div className="mt-4 grid gap-4 sm:grid-cols-2">
				{standard.map((quiz) => (
					<QuizCard key={quiz.slug} quiz={quiz} />
				))}
			</div>

			<SignInDialog
				open={showSignInDialog}
				onOpenChange={setShowSignInDialog}
			/>

			<GlassDialog open={showTopicDialog} onOpenChange={setShowTopicDialog}>
				<GlassDialogContent>
					<GlassDialogHeader>
						<GlassDialogTitle>Ask Gemini for a quiz</GlassDialogTitle>
						<GlassDialogDescription>
							Tell it a topic — e.g. "solar panel recycling" or "fast fashion's
							footprint" — and it'll write a fresh 5-question quiz grounded in
							real data.
						</GlassDialogDescription>
					</GlassDialogHeader>
					<GlassInput
						value={topic}
						onChange={(e) => setTopic(e.target.value)}
						placeholder="What should the quiz be about?"
						className="mt-4"
					/>
					<GlassDialogFooter>
						<GlassButton
							variant="outline"
							onClick={() => setShowTopicDialog(false)}
						>
							Cancel
						</GlassButton>
						<GlassButton
							variant="primary"
							disabled={!topic.trim() || generate.isPending}
							onClick={askGemini}
						>
							{generate.isPending ? "Generating…" : "Generate"}
						</GlassButton>
					</GlassDialogFooter>
				</GlassDialogContent>
			</GlassDialog>
		</div>
	);
}

function QuizCard({ quiz, badge }: { quiz: QuizSummary; badge?: string }) {
	return (
		<Link to="/quiz/$slug" params={{ slug: quiz.slug }}>
			<GlassCard className="h-full transition hover:-translate-y-0.5">
				<GlassCardHeader>
					<div className="flex items-center gap-2">
						<GlassBadge variant="outline" className="w-fit">
							{formatCategory(quiz.category)}
						</GlassBadge>
						{badge && (
							<GlassBadge variant="success" className="w-fit">
								{badge}
							</GlassBadge>
						)}
					</div>
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
	);
}

function SignInDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<GlassDialog open={open} onOpenChange={onOpenChange}>
			<GlassDialogContent>
				<GlassDialogHeader>
					<GlassDialogTitle>Sign in to generate quizzes</GlassDialogTitle>
					<GlassDialogDescription>
						AI quiz generation counts toward your leaderboard points, so it
						needs an account.
					</GlassDialogDescription>
				</GlassDialogHeader>
				<GlassDialogFooter>
					<GlassButton variant="outline" onClick={() => onOpenChange(false)}>
						Not now
					</GlassButton>
					<Link to="/login">
						<GlassButton variant="primary">Sign in</GlassButton>
					</Link>
				</GlassDialogFooter>
			</GlassDialogContent>
		</GlassDialog>
	);
}
