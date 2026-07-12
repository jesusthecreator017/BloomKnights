import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import {
	ClipboardList,
	Compass,
	Home,
	Leaf,
	ListChecks,
	LogOut,
	MapPinned,
	Menu,
	Trophy,
	X,
} from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "#/components/theme-toggle";
import { GlassButton } from "#/components/ui/glass-button";
import { useLeaderboard } from "#/hooks/use-leaderboard";
import { signOut, useSession } from "#/lib/auth-client";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Ecoverse — Grow the Change",
			},
			{
				name: "description",
				content:
					"See the environmental cost of everyday life, and the clean-energy actions that fix it.",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	component: RootLayout,
	shellComponent: RootDocument,
});

const navLinks = [
	{ to: "/", label: "Home", icon: Home },
	{ to: "/map", label: "Map", icon: MapPinned },
	{ to: "/explorer", label: "Explorer", icon: Compass },
	{ to: "/resources", label: "Resources", icon: ListChecks },
	{ to: "/quiz", label: "Quiz", icon: ClipboardList },
	{ to: "/leaderboard", label: "Leaderboard", icon: Trophy },
] as const;

function AuthNav() {
	const { data: session, isPending } = useSession();
	const { data: leaderboard } = useLeaderboard(1);

	if (isPending) return null;

	if (!session) {
		return (
			<Link to="/login">
				<GlassButton variant="primary" size="sm">
					Get Started
				</GlassButton>
			</Link>
		);
	}

	return (
		<div className="flex items-center gap-3">
			<span className="hidden text-sm text-foreground/70 sm:inline">
				{session.user.name}
				{leaderboard?.me && (
					<span className="text-forest-400">
						{" "}
						· {leaderboard.me.points} pts
					</span>
				)}
			</span>
			<GlassButton
				variant="ghost"
				size="sm"
				className="text-foreground/70 hover:bg-foreground/10 hover:text-foreground"
				onClick={() => signOut()}
			>
				<LogOut className="h-4 w-4" /> Sign out
			</GlassButton>
		</div>
	);
}

function RootLayout() {
	const [menuOpen, setMenuOpen] = useState(false);

	return (
		<div className="relative flex min-h-screen flex-col bg-background text-foreground">
			{/* ambient gradient backdrop so glass surfaces have something to blur */}
			<div className="pointer-events-none fixed inset-0 overflow-hidden">
				<div className="absolute -top-40 -left-40 h-[34rem] w-[34rem] rounded-full bg-forest-500/25 blur-[140px]" />
				<div className="absolute top-1/3 -right-32 h-[30rem] w-[30rem] rounded-full bg-navy-400/25 blur-[140px]" />
				<div className="absolute -bottom-40 left-1/3 h-[28rem] w-[28rem] rounded-full bg-forest-400/15 blur-[140px]" />
			</div>

			<header className="sticky top-0 z-40 border-b border-border bg-white/5 backdrop-blur-xl">
				{/* phones: hamburger dropdown; md+: one 3-col row with inline nav */}
				<div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 md:grid md:h-16 md:grid-cols-3 md:gap-4">
					<button
						type="button"
						onClick={() => setMenuOpen((v) => !v)}
						aria-label={menuOpen ? "Close menu" : "Open menu"}
						aria-expanded={menuOpen}
						className="-ml-1 rounded-lg p-2 text-foreground/80 transition hover:bg-foreground/10 md:hidden"
					>
						{menuOpen ? (
							<X className="h-5 w-5" />
						) : (
							<Menu className="h-5 w-5" />
						)}
					</button>
					<Link
						to="/"
						onClick={() => setMenuOpen(false)}
						className="flex shrink-0 items-center gap-2 font-bold md:justify-self-start"
					>
						<Leaf className="h-5 w-5 text-forest-400" />
						<span className="text-lg tracking-tight">Ecoverse</span>
					</Link>
					<nav className="hidden items-center justify-center gap-1 md:col-start-2 md:flex md:justify-self-center">
						{navLinks.map((link) => (
							<Link
								key={link.to}
								to={link.to}
								className="flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm text-foreground/70 transition hover:bg-foreground/10 hover:text-foreground"
								activeProps={{
									className:
										"flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm bg-foreground/10 text-foreground",
								}}
								activeOptions={{ exact: link.to === "/" }}
							>
								<link.icon className="h-3.5 w-3.5" />
								{link.label}
							</Link>
						))}
					</nav>
					<div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0 md:justify-self-end">
						<ThemeToggle />
						<AuthNav />
					</div>
				</div>

				{menuOpen && (
					<nav className="border-border border-t px-4 py-2 md:hidden">
						{navLinks.map((link) => (
							<Link
								key={link.to}
								to={link.to}
								onClick={() => setMenuOpen(false)}
								className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-foreground/70 text-sm transition hover:bg-foreground/10 hover:text-foreground"
								activeProps={{
									className:
										"flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm bg-foreground/10 text-foreground",
								}}
								activeOptions={{ exact: link.to === "/" }}
							>
								<link.icon className="h-4 w-4" />
								{link.label}
							</Link>
						))}
					</nav>
				)}
			</header>

			<main className="relative z-10 flex-1">
				<Outlet />
			</main>

			<footer className="relative z-10 border-t border-border py-6 text-center text-sm text-muted-foreground">
				© 2026 Ecoverse
			</footer>
		</div>
	);
}

// Reads the persisted theme (or system preference) and applies the `dark`
// class before first paint, so there's no flash of the wrong theme.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('bk-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: static inline script, no user input */}
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
