import { beforeEach, describe, expect, it } from "vitest";
import { questions, quizzes, user } from "../db/schema";
import { getLeaderboard, getQuizForPlay, submitQuiz } from "../lib/quiz";
import { resetDb, testDb } from "./db";

async function makeUser(id: string, name: string) {
	await testDb.insert(user).values({ id, name, email: `${id}@test.dev` });
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
