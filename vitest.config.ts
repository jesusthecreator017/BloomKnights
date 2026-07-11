import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["src/tests/**/*.test.ts"],
		// db integration tests share one Postgres test db — no parallel files
		fileParallelism: false,
	},
});
