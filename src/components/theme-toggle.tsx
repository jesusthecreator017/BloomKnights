import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { GlassButton } from "#/components/ui/glass-button";

type Theme = "light" | "dark";

function readTheme(): Theme {
	return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** Client-only toggle — the blocking script in __root.tsx already set the initial class. */
export function ThemeToggle() {
	const [theme, setTheme] = useState<Theme | null>(null);

	useEffect(() => {
		setTheme(readTheme());
	}, []);

	function toggle() {
		const next: Theme = theme === "dark" ? "light" : "dark";
		document.documentElement.classList.toggle("dark", next === "dark");
		localStorage.setItem("bk-theme", next);
		setTheme(next);
	}

	if (theme === null) {
		return (
			<GlassButton
				variant="ghost"
				size="icon"
				className="text-foreground/70"
				aria-label="Toggle theme"
				disabled
			/>
		);
	}

	return (
		<GlassButton
			variant="ghost"
			size="icon"
			className="text-foreground/70 hover:bg-foreground/10 hover:text-foreground"
			onClick={toggle}
			aria-label={
				theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
			}
		>
			{theme === "dark" ? (
				<Sun className="h-4 w-4" />
			) : (
				<Moon className="h-4 w-4" />
			)}
		</GlassButton>
	);
}
