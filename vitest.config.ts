import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Load .env so `bun run test` works without manually sourcing it.
// CI sets these vars directly, so a missing .env is fine there.
function loadDotenv(path = ".env"): Record<string, string> {
	try {
		const out: Record<string, string> = {};
		for (const line of readFileSync(path, "utf8").split("\n")) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;
			const eq = trimmed.indexOf("=");
			if (eq === -1) continue;
			out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
		}
		return out;
	} catch {
		return {};
	}
}

export default defineConfig({
	test: {
		environment: "node",
		include: ["src/tests/**/*.test.ts"],
		// db integration tests share one Postgres test db — no parallel files
		fileParallelism: false,
		// merge .env under real env vars (CI-provided vars win)
		env: { ...loadDotenv(), ...process.env },
	},
});
