import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
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
import { useAskGemini } from "#/hooks/use-ask-gemini";
import type { AskGeminiRequest } from "#/lib/api-types";

/** Sign-in gate dialog shared by every Ask Ecoverse AI surface. */
export function AskGeminiSignInDialog({
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
					<GlassDialogTitle>Sign in to ask Gemini</GlassDialogTitle>
					<GlassDialogDescription>
						Asking questions is gated to signed-in accounts so it isn't abused.
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

/** Grounds the question in whatever the user is currently looking at — a location, event, or initiative. */
export function AskGeminiBox({
	context,
}: {
	context: AskGeminiRequest["context"];
}) {
	const {
		question,
		setQuestion,
		answer,
		error,
		isPending,
		showSignIn,
		setShowSignIn,
		submit,
	} = useAskGemini(context);

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
					disabled={!question.trim() || isPending}
					onClick={submit}
				>
					{isPending ? "…" : "Ask"}
				</GlassButton>
			</div>
			{error && <p className="mt-2 text-red-400 text-xs">{error}</p>}
			{answer && (
				<p className="mt-2 text-sm text-white/80 leading-relaxed">{answer}</p>
			)}

			<AskGeminiSignInDialog open={showSignIn} onOpenChange={setShowSignIn} />
		</div>
	);
}
