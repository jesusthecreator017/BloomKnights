import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";

const url = process.env.TEST_DATABASE_URL;
if (!url) {
	throw new Error(
		"TEST_DATABASE_URL is not set — run `bun run db:up` and copy .env.example to .env",
	);
}

export const testClient = postgres(url, { max: 5 });
export const testDb = drizzle(testClient, { schema });

/** Wipe quiz/attempt/user/city rows between tests. */
export async function resetDb() {
	await testClient`truncate table user_cities, quiz_attempts, questions, quizzes, cities, "user" restart identity cascade`;
}
