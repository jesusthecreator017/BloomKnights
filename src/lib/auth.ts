import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import { account, session, user, verification } from "../db/schema";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: { user, session, account, verification },
	}),
	emailAndPassword: {
		enabled: true,
	},
	// better-auth's own limiter, on top of the global middleware guard
	rateLimit: {
		enabled: true,
		window: 60,
		max: 20,
	},
	secret: process.env.BETTER_AUTH_SECRET,
	baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
	// behind the Cloudflare Tunnel the app is reached via the public domain;
	// trust it plus the local dev ports so auth requests aren't rejected as CSRF
	trustedOrigins: [
		"http://localhost:3000",
		"http://localhost:3001",
		"http://127.0.0.1:3000",
		"http://127.0.0.1:3001",
		...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
	],
});
