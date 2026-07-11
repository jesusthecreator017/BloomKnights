import { asc, desc, eq, sql } from "drizzle-orm";
import type { db as appDb } from "../db";
import { questions, quizAttempts, quizzes, user } from "../db/schema";
import { bust, cached } from "./cache";

type DB = typeof appDb;

const LEADERBOARD_TTL_MS = 15_000;

export async function listQuizzes(db: DB) {
	return db
		.select({
			slug: quizzes.slug,
			title: quizzes.title,
			category: quizzes.category,
			questionCount: sql<number>`count(${questions.id})::int`,
			totalPoints: sql<number>`coalesce(sum(${questions.points}), 0)::int`,
		})
		.from(quizzes)
		.leftJoin(questions, eq(questions.quizId, quizzes.id))
		.groupBy(quizzes.id)
		.orderBy(asc(quizzes.id));
}

/** Questions without correctIndex/explanation — safe to send to the client. */
export async function getQuizForPlay(db: DB, slug: string) {
	const [quiz] = await db.select().from(quizzes).where(eq(quizzes.slug, slug));
	if (!quiz) return null;

	const qs = await db
		.select({
			id: questions.id,
			prompt: questions.prompt,
			choices: questions.choices,
			points: questions.points,
		})
		.from(questions)
		.where(eq(questions.quizId, quiz.id))
		.orderBy(asc(questions.id));

	return {
		slug: quiz.slug,
		title: quiz.title,
		category: quiz.category,
		questions: qs,
	};
}

export type SubmitResult =
	| { status: "not_found" }
	| { status: "already_attempted" }
	| {
			status: "graded";
			score: number;
			maxScore: number;
			results: Array<{
				questionId: number;
				correctIndex: number;
				yourAnswer: number | null;
				correct: boolean;
				explanation: string;
			}>;
	  };

export async function submitQuiz(
	db: DB,
	userId: string,
	slug: string,
	answers: Array<number>,
): Promise<SubmitResult> {
	const [quiz] = await db.select().from(quizzes).where(eq(quizzes.slug, slug));
	if (!quiz) return { status: "not_found" };

	const qs = await db
		.select()
		.from(questions)
		.where(eq(questions.quizId, quiz.id))
		.orderBy(asc(questions.id));

	let score = 0;
	let maxScore = 0;
	const results = qs.map((q, i) => {
		const yourAnswer = typeof answers[i] === "number" ? answers[i] : null;
		const correct = yourAnswer === q.correctIndex;
		maxScore += q.points;
		if (correct) score += q.points;
		return {
			questionId: q.id,
			correctIndex: q.correctIndex,
			yourAnswer,
			correct,
			explanation: q.explanation,
		};
	});

	try {
		await db.insert(quizAttempts).values({ userId, quizId: quiz.id, score });
		bust("leaderboard:"); // scores changed — drop cached rankings
	} catch (err) {
		// unique(userId, quizId) violation → already attempted
		// drizzle wraps the PostgresError, so the code may live on err.cause
		const pgError =
			err instanceof Error && err.cause instanceof Error ? err.cause : err;
		if (
			pgError instanceof Error &&
			"code" in pgError &&
			pgError.code === "23505"
		) {
			return { status: "already_attempted" };
		}
		throw err;
	}

	return { status: "graded", score, maxScore, results };
}

export async function getLeaderboard(db: DB, limit = 20, userId?: string) {
	// The top-N aggregate is identical for everyone, so cache it briefly; the
	// per-user `me` below stays live. Busted on every quiz submit.
	const top = await cached(`leaderboard:top:${limit}`, LEADERBOARD_TTL_MS, () =>
		db
			.select({
				userId: quizAttempts.userId,
				name: user.name,
				points: sql<number>`sum(${quizAttempts.score})::int`,
				quizzesTaken: sql<number>`count(*)::int`,
			})
			.from(quizAttempts)
			.innerJoin(user, eq(user.id, quizAttempts.userId))
			.groupBy(quizAttempts.userId, user.name)
			.orderBy(desc(sql`sum(${quizAttempts.score})`))
			.limit(limit),
	);

	const entries = top.map((row, i) => ({ rank: i + 1, ...row }));

	let me: (typeof entries)[number] | null =
		entries.find((e) => e.userId === userId) ?? null;
	if (!me && userId) {
		const [mine] = await db
			.select({
				points: sql<number>`sum(${quizAttempts.score})::int`,
				quizzesTaken: sql<number>`count(*)::int`,
				rank: sql<number>`(
					select count(*) + 1 from (
						select user_id from quiz_attempts group by user_id
						having sum(score) > (select coalesce(sum(score), 0) from quiz_attempts where user_id = ${userId})
					) better
				)::int`,
			})
			.from(quizAttempts)
			.where(eq(quizAttempts.userId, userId));
		if (mine && mine.points != null) {
			const [u] = await db
				.select({ name: user.name })
				.from(user)
				.where(eq(user.id, userId));
			me = {
				rank: mine.rank,
				userId,
				name: u?.name ?? "You",
				points: mine.points,
				quizzesTaken: mine.quizzesTaken,
			};
		}
	}

	return { entries, me };
}
