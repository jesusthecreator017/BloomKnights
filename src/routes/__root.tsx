import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Leaf } from "lucide-react";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
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
				title: "BloomKnights — Grow the Change",
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
	{ to: "/", label: "Home" },
	{ to: "/map", label: "Map" },
	{ to: "/act", label: "Act" },
] as const;

function RootLayout() {
	return (
		<div className="relative min-h-screen bg-[#06120f] text-white">
			{/* ambient gradient backdrop so glass surfaces have something to blur */}
			<div className="pointer-events-none fixed inset-0 overflow-hidden">
				<div className="absolute -top-40 -left-40 h-[34rem] w-[34rem] rounded-full bg-emerald-500/25 blur-[140px]" />
				<div className="absolute top-1/3 -right-32 h-[30rem] w-[30rem] rounded-full bg-cyan-500/20 blur-[140px]" />
				<div className="absolute -bottom-40 left-1/3 h-[28rem] w-[28rem] rounded-full bg-teal-400/15 blur-[140px]" />
			</div>

			<header className="sticky top-0 z-40 border-b border-white/10 bg-white/5 backdrop-blur-xl">
				<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
					<Link to="/" className="flex items-center gap-2 font-bold">
						<Leaf className="h-5 w-5 text-emerald-400" />
						<span className="text-lg tracking-tight">BloomKnights</span>
					</Link>
					<nav className="flex items-center gap-1">
						{navLinks.map((link) => (
							<Link
								key={link.to}
								to={link.to}
								className="rounded-full px-4 py-1.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
								activeProps={{
									className:
										"rounded-full px-4 py-1.5 text-sm bg-white/15 text-white",
								}}
								activeOptions={{ exact: link.to === "/" }}
							>
								{link.label}
							</Link>
						))}
					</nav>
				</div>
			</header>

			<main className="relative z-10">
				<Outlet />
			</main>
		</div>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="dark">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
