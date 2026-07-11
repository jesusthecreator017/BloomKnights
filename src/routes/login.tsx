import { createFileRoute } from "@tanstack/react-router";
import { Leaf } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { GlassButton } from "#/components/ui/glass-button";
import { GlassCard, GlassCardContent } from "#/components/ui/glass-card";
import {
	GlassDialog,
	GlassDialogContent,
	GlassDialogDescription,
	GlassDialogFooter,
	GlassDialogHeader,
	GlassDialogTitle,
} from "#/components/ui/glass-dialog";
import { GlassInput } from "#/components/ui/glass-input";
import {
	GlassTabs,
	GlassTabsContent,
	GlassTabsList,
	GlassTabsTrigger,
} from "#/components/ui/glass-tabs";

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
	const [dialogOpen, setDialogOpen] = useState(false);

	// Frontend-only preview — no auth backend exists yet. Swap this for a
	// real submit handler once the team's API is up.
	function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setDialogOpen(true);
	}

	return (
		<div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col items-center justify-center px-4 py-16">
			<div className="mb-6 flex flex-col items-center text-center">
				<Leaf className="h-8 w-8 text-forest-400" />
				<h1 className="mt-3 text-2xl font-bold">Join BloomKnights</h1>
				<p className="mt-1 text-sm text-white/60">
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
							<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
								<Field id="login-email" label="Email">
									<GlassInput
										id="login-email"
										type="email"
										required
										placeholder="you@example.com"
									/>
								</Field>
								<Field id="login-password" label="Password">
									<GlassInput
										id="login-password"
										type="password"
										required
										placeholder="••••••••"
									/>
								</Field>
								<GlassButton type="submit" variant="primary" className="mt-2">
									Sign in
								</GlassButton>
							</form>
						</GlassTabsContent>

						<GlassTabsContent value="register">
							<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
								<Field id="register-name" label="Name">
									<GlassInput
										id="register-name"
										required
										placeholder="Ada Lovelace"
									/>
								</Field>
								<Field id="register-email" label="Email">
									<GlassInput
										id="register-email"
										type="email"
										required
										placeholder="you@example.com"
									/>
								</Field>
								<Field id="register-password" label="Password">
									<GlassInput
										id="register-password"
										type="password"
										required
										placeholder="At least 8 characters"
									/>
								</Field>
								<GlassButton type="submit" variant="primary" className="mt-2">
									Create account
								</GlassButton>
							</form>
						</GlassTabsContent>
					</GlassTabs>
				</GlassCardContent>
			</GlassCard>

			<GlassDialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<GlassDialogContent>
					<GlassDialogHeader>
						<GlassDialogTitle>Accounts are coming soon</GlassDialogTitle>
						<GlassDialogDescription>
							This is a frontend preview — sign-in and registration aren't wired
							up to a backend yet. Check back once auth is live.
						</GlassDialogDescription>
					</GlassDialogHeader>
					<GlassDialogFooter>
						<GlassButton variant="outline" onClick={() => setDialogOpen(false)}>
							Got it
						</GlassButton>
					</GlassDialogFooter>
				</GlassDialogContent>
			</GlassDialog>
		</div>
	);
}
