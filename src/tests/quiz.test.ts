import { beforeEach, describe, expect, it } from "vitest";
import { cities, questions, quizzes, user } from "../db/schema";
import { clearCache } from "../lib/cache";
import {
	getCityLeaderboard,
	getLeaderboard,
	getQuizForPlay,
	getUserCity,
	joinCity,
	listCities,
	submitQuiz,
} from "../lib/quiz";
import { resetDb, testDb } from "./db";

async function makeUser(id: string, name: string) {
	await testDb.insert(user).values({ id, name, email: `${id}@test.dev` });
}

async function makeCity(slug: string, name: string) {
	await testDb.insert(cities).values({ slug, name, country: "USA" });
}

async function makeQuiz(slug: string) {
	const [quiz] = await testDb
		.insert(quizzes)
		.values({ slug, title: `Quiz ${slug}`, category: "test" })
		.returning();
	await testDb.insert(questions).values([
		{
			quizId: quiz.id,
			prompt: "Q1",
			choices: ["a", "b", "c"],
			correctIndex: 1,
			points: 10,
			explanation: "because b",
		},
		{
			quizId: quiz.id,
			prompt: "Q2",
			choices: ["a", "b"],
			correctIndex: 0,
			points: 10,
			explanation: "because a",
		},
	]);
	return quiz;
}

beforeEach(async () => {
	await resetDb();
	clearCache(); // the leaderboard is cached; isolate each test
});

describe("getQuizForPlay", () => {
	it("returns questions without the answer key", async () => {
		await makeQuiz("play");
		const quiz = await getQuizForPlay(testDb, "play");
		expect(quiz?.questions).toHaveLength(2);
		expect(quiz?.questions[0]).not.toHaveProperty("correctIndex");
		expect(quiz?.questions[0]).not.toHaveProperty("explanation");
	});

	it("returns null for unknown slug", async () => {
		expect(await getQuizForPlay(testDb, "nope")).toBeNull();
	});
});

describe("submitQuiz", () => {
	it("grades correct answers and awards points", async () => {
		await makeUser("u1", "Alice");
		await makeQuiz("grade");
		const result = await submitQuiz(testDb, "u1", "grade", [1, 0]);
		expect(result.status).toBe("graded");
		if (result.status === "graded") {
			expect(result.score).toBe(20);
			expect(result.maxScore).toBe(20);
			expect(result.results.every((r) => r.correct)).toBe(true);
		}
	});

	it("gives partial credit for partial answers", async () => {
		await makeUser("u1", "Alice");
		await makeQuiz("partial");
		const result = await submitQuiz(testDb, "u1", "partial", [1, 1]);
		expect(result.status).toBe("graded");
		if (result.status === "graded") expect(result.score).toBe(10);
	});

	it("rejects a second attempt at the same quiz", async () => {
		await makeUser("u1", "Alice");
		await makeQuiz("once");
		await submitQuiz(testDb, "u1", "once", [1, 0]);
		const retry = await submitQuiz(testDb, "u1", "once", [1, 0]);
		expect(retry.status).toBe("already_attempted");
	});

	it("returns not_found for unknown quiz", async () => {
		await makeUser("u1", "Alice");
		const result = await submitQuiz(testDb, "u1", "ghost", [0]);
		expect(result.status).toBe("not_found");
	});
});

describe("getLeaderboard", () => {
	it("ranks users by total points descending", async () => {
		await makeUser("u1", "Alice");
		await makeUser("u2", "Bob");
		await makeQuiz("q1");
		await makeQuiz("q2");
		// Alice: 20 on q1. Bob: 10 on q1 + 20 on q2 = 30.
		await submitQuiz(testDb, "u1", "q1", [1, 0]);
		await submitQuiz(testDb, "u2", "q1", [1, 1]);
		await submitQuiz(testDb, "u2", "q2", [1, 0]);

		const board = await getLeaderboard(testDb, 10, "u1");
		expect(board.entries.map((e) => e.name)).toEqual(["Bob", "Alice"]);
		expect(board.entries[0].points).toBe(30);
		expect(board.entries[1].points).toBe(20);
		expect(board.me?.name).toBe("Alice");
		expect(board.me?.rank).toBe(2);
	});

	it("computes rank for a user outside the top slice", async () => {
		await makeQuiz("q1");
		for (let i = 0; i < 5; i++) {
			await makeUser(`u${i}`, `User ${i}`);
			// give higher-index users more points via more correct answers
			await submitQuiz(testDb, `u${i}`, "q1", i === 0 ? [1, 1] : [1, 0]);
		}
		// u0 got 10, others got 20. Ask for top 2, check u0 still gets a rank.
		const board = await getLeaderboard(testDb, 2, "u0");
		expect(board.entries).toHaveLength(2);
		expect(board.me?.userId).toBe("u0");
		expect(board.me?.points).toBe(10);
		expect(board.me?.rank).toBe(5);
	});
});

describe("joinCity / getUserCity", () => {
	it("lets a user join and later switch cities", async () => {
		await makeUser("u1", "Alice");
		await makeCity("nyc", "New York City");
		await makeCity("la", "Los Angeles");

		const joined = await joinCity(testDb, "u1", "nyc");
		expect(joined?.slug).toBe("nyc");
		expect((await getUserCity(testDb, "u1"))?.slug).toBe("nyc");

		const switched = await joinCity(testDb, "u1", "la");
		expect(switched?.slug).toBe("la");
		expect((await getUserCity(testDb, "u1"))?.slug).toBe("la");
	});

	it("returns null for an unknown city slug", async () => {
		await makeUser("u1", "Alice");
		expect(await joinCity(testDb, "u1", "atlantis")).toBeNull();
	});

	it("returns null when a user hasn't joined a city", async () => {
		await makeUser("u1", "Alice");
		expect(await getUserCity(testDb, "u1")).toBeNull();
	});
});

describe("listCities", () => {
	it("ranks cities by the combined score of their members", async () => {
		await makeUser("u1", "Alice");
		await makeUser("u2", "Bob");
		await makeCity("nyc", "New York City");
		await makeCity("la", "Los Angeles");
		await makeQuiz("q1");
		await joinCity(testDb, "u1", "nyc");
		await joinCity(testDb, "u2", "la");
		await submitQuiz(testDb, "u1", "q1", [1, 0]); // Alice/nyc: 20
		await submitQuiz(testDb, "u2", "q1", [1, 1]); // Bob/la: 10

		const board = await listCities(testDb);
		const nyc = board.find((c) => c.slug === "nyc");
		const la = board.find((c) => c.slug === "la");
		expect(nyc?.points).toBe(20);
		expect(nyc?.memberCount).toBe(1);
		expect(la?.points).toBe(10);
		expect(board[0].slug).toBe("nyc");
	});

	it("shows unjoined cities with zero points and members", async () => {
		await makeCity("orlando", "Orlando");
		const board = await listCities(testDb);
		const orlando = board.find((c) => c.slug === "orlando");
		expect(orlando?.points).toBe(0);
		expect(orlando?.memberCount).toBe(0);
	});
});

describe("getCityLeaderboard", () => {
	it("only ranks members of that city", async () => {
		await makeUser("u1", "Alice");
		await makeUser("u2", "Bob");
		await makeCity("nyc", "New York City");
		await makeQuiz("q1");
		await joinCity(testDb, "u1", "nyc");
		// Bob never joins a city
		await submitQuiz(testDb, "u1", "q1", [1, 0]);
		await submitQuiz(testDb, "u2", "q1", [1, 1]);

		const board = await getCityLeaderboard(testDb, "nyc", 20, "u1");
		expect(board?.city.slug).toBe("nyc");
		expect(board?.entries.map((e) => e.name)).toEqual(["Alice"]);
		expect(board?.me?.name).toBe("Alice");
	});

	it("returns null for an unknown city", async () => {
		expect(await getCityLeaderboard(testDb, "atlantis")).toBeNull();
	});
});
