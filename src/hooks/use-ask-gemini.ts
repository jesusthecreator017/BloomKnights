import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ApiClientError, fetchJson } from "#/lib/api-client";
import type { AskGeminiRequest, AskGeminiResponse } from "#/lib/api-types";

/** Shared state/logic behind "Ask Ecoverse AI" — grounds a question in whatever the user is looking at. */
export function useAskGemini(context: AskGeminiRequest["context"]) {
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

	return {
		question,
		setQuestion,
		answer,
		error,
		isPending: ask.isPending,
		showSignIn,
		setShowSignIn,
		submit,
	};
}
