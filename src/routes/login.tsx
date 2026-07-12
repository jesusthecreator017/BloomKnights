import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Leaf } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { GlassButton } from "#/components/ui/glass-button";
import { GlassCard, GlassCardContent } from "#/components/ui/glass-card";
import { GlassInput } from "#/components/ui/glass-input";
import {
	GlassTabs,
	GlassTabsContent,
	GlassTabsList,
	GlassTabsTrigger,
} from "#/components/ui/glass-tabs";
import { signIn, signUp } from "#/lib/auth-client";

export const Route = createFileRoute("/login")({ component: LoginPage });

function Field({
	id,
	label,
	children,
}: {
	id: string;
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5 text-sm text-white/70">
			<label htmlFor={id}>{label}</label>
			{children}
		</div>
	);
}

function LoginPage() {
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleLogin(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setIsSubmitting(true);
		const form = new FormData(e.currentTarget);
		const { error: authError } = await signIn.email({
			email: String(form.get("email")),
			password: String(form.get("password")),
		});
		setIsSubmitting(false);
		if (authError) {
			setError(authError.message ?? "Couldn't sign in — check your details.");
			return;
		}
		navigate({ to: "/" });
	}

	async function handleRegister(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setIsSubmitting(true);
		const form = new FormData(e.currentTarget);
		const { error: authError } = await signUp.email({
			name: String(form.get("name")),
			email: String(form.get("email")),
			password: String(form.get("password")),
		});
		setIsSubmitting(false);
		if (authError) {
			setError(authError.message ?? "Couldn't create your account.");
			return;
		}
		navigate({ to: "/" });
	}

	return (
		<div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col items-center justify-center px-4 py-10 sm:py-16">
			<div className="mb-6 flex flex-col items-center text-center">
				<Leaf className="h-8 w-8 text-forest-400" />
				<h1 className="mt-3 text-2xl font-bold">Join Ecoverse</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Track your impact and find clean-energy actions near you.
				</p>
			</div>

			<GlassCard className="w-full">
				<GlassCardContent className="pt-6">
					<GlassTabs defaultValue="login">
						<GlassTabsList className="w-full">
							<GlassTabsTrigger value="login" className="flex-1">
								Sign in
							</GlassTabsTrigger>
							<GlassTabsTrigger value="register" className="flex-1">
								Create account
							</GlassTabsTrigger>
						</GlassTabsList>

						<GlassTabsContent value="login">
							<form className="flex flex-col gap-4" onSubmit={handleLogin}>
								<Field id="login-email" label="Email">
									<GlassInput
										id="login-email"
										name="email"
										type="email"
										required
										placeholder="you@example.com"
									/>
								</Field>
								<Field id="login-password" label="Password">
									<GlassInput
										id="login-password"
										name="password"
										type="password"
										required
										minLength={8}
										placeholder="••••••••"
									/>
								</Field>
								<GlassButton
									type="submit"
									variant="primary"
									className="mt-2"
									disabled={isSubmitting}
								>
									{isSubmitting ? "Signing in…" : "Sign in"}
								</GlassButton>
							</form>
						</GlassTabsContent>

						<GlassTabsContent value="register">
							<form className="flex flex-col gap-4" onSubmit={handleRegister}>
								<Field id="register-name" label="Name">
									<GlassInput
										id="register-name"
										name="name"
										required
										placeholder="Ada Lovelace"
									/>
								</Field>
								<Field id="register-email" label="Email">
									<GlassInput
										id="register-email"
										name="email"
										type="email"
										required
										placeholder="you@example.com"
									/>
								</Field>
								<Field id="register-password" label="Password">
									<GlassInput
										id="register-password"
										name="password"
										type="password"
										required
										minLength={8}
										placeholder="At least 8 characters"
									/>
								</Field>
								<GlassButton
									type="submit"
									variant="primary"
									className="mt-2"
									disabled={isSubmitting}
								>
									{isSubmitting ? "Creating account…" : "Create account"}
								</GlassButton>
							</form>
						</GlassTabsContent>
					</GlassTabs>

					{error && (
						<p className="mt-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">
							{error}
						</p>
					)}
				</GlassCardContent>
			</GlassCard>
		</div>
	);
}
