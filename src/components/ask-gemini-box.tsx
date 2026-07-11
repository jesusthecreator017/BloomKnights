import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { GlassButton } from "#/components/ui/glass-button";
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
import type { AskGeminiRequest, AskGeminiResponse } from "#/lib/api-types";

/** Grounds the question in whatever the user is currently looking at — a location, event, or initiative. */
export function AskGeminiBox({
	context,
}: {
	context: AskGeminiRequest["context"];
}) {
	const [question, setQuestion] = useState("");
	const [answer, setAnswer] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [showSignIn, setShowSignIn] = useState(false);

	const ask = useMutation({
		mutationFn: (q: string) =>
			fetchJson<AskGeminiResponse>("/api/gemini/ask", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					question: q,
					context,
				} satisfies AskGeminiRequest),
			}),
		onSuccess: (res) => {
			setAnswer(res.answer);
			setError(null);
		},
		onError: (err) => {
			setAnswer(null);
			if (err instanceof ApiClientError) {
				if (err.status === 401) {
					setShowSignIn(true);
					return;
				}
				if (err.status === 429) {
					setError("You're asking too fast — slow down and try again shortly.");
					return;
				}
				if (err.status === 500) {
					setError("Ask Gemini isn't set up yet (missing GEMINI_API_KEY).");
					return;
				}
				setError("Gemini couldn't answer that right now — try again.");
				return;
			}
			setError("Something went wrong asking that.");
		},
	});

	function submit() {
		const q = question.trim();
		if (!q) return;
		setError(null);
		ask.mutate(q);
	}

	return (
		<div className="border-white/10 border-t pt-3">
			<div className="flex items-center gap-2 text-sm text-white/70">
				<Sparkles className="h-4 w-4 text-forest-400" /> Ask Ecoverse AI
			</div>
			<div className="mt-2 flex gap-2">
				<GlassInput
					value={question}
					onChange={(e) => setQuestion(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && submit()}
					placeholder="Ask a question about this…"
					className="text-sm"
				/>
				<GlassButton
					variant="primary"
					size="sm"
					disabled={!question.trim() || ask.isPending}
					onClick={submit}
				>
					{ask.isPending ? "…" : "Ask"}
				</GlassButton>
			</div>
			{error && <p className="mt-2 text-red-400 text-xs">{error}</p>}
			{answer && (
				<p className="mt-2 text-sm text-white/80 leading-relaxed">{answer}</p>
			)}

			<GlassDialog open={showSignIn} onOpenChange={setShowSignIn}>
				<GlassDialogContent>
					<GlassDialogHeader>
						<GlassDialogTitle>Sign in to ask Gemini</GlassDialogTitle>
						<GlassDialogDescription>
							Asking questions is gated to signed-in accounts so it isn't
							abused.
						</GlassDialogDescription>
					</GlassDialogHeader>
					<GlassDialogFooter>
						<GlassButton variant="outline" onClick={() => setShowSignIn(false)}>
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
