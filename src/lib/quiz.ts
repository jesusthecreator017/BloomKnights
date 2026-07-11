import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { db as appDb } from "../db";
import {
	cities,
	questions,
	quizAttempts,
	quizzes,
	user,
	userCities,
} from "../db/schema";
import { bust, cached } from "./cache";

type DB = typeof appDb;

const LEADERBOARD_TTL_MS = 15_000;

export async function listQuizzes(db: DB) {
	return db
		.select({
			slug: quizzes.slug,
			title: quizzes.title,
			category: quizzes.category,
			createdBy: quizzes.createdBy,
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

export interface CityEntry {
	rank: number;
	slug: string;
	name: string;
	country: string;
	points: number;
	memberCount: number;
}

/** Cities ranked by the combined quiz score of everyone who's joined them. */
export async function listCities(db: DB): Promise<CityEntry[]> {
	const rows = await cached("leaderboard:cities:top", LEADERBOARD_TTL_MS, () =>
		db
			.select({
				slug: cities.slug,
				name: cities.name,
				country: cities.country,
				points: sql<number>`coalesce(sum(${quizAttempts.score}), 0)::int`,
				memberCount: sql<number>`count(distinct ${userCities.userId})::int`,
			})
			.from(cities)
			.leftJoin(userCities, eq(userCities.cityId, cities.id))
			.leftJoin(quizAttempts, eq(quizAttempts.userId, userCities.userId))
			.groupBy(cities.id)
			.orderBy(desc(sql`coalesce(sum(${quizAttempts.score}), 0)`)),
	);
	return rows.map((row, i) => ({ rank: i + 1, ...row }));
}

export async function getCityLeaderboard(
	db: DB,
	slug: string,
	limit = 20,
	userId?: string,
) {
	const [city] = await db.select().from(cities).where(eq(cities.slug, slug));
	if (!city) return null;

	const top = await cached(
		`leaderboard:city:${slug}:top:${limit}`,
		LEADERBOARD_TTL_MS,
		() =>
			db
				.select({
					userId: quizAttempts.userId,
					name: user.name,
					points: sql<number>`sum(${quizAttempts.score})::int`,
					quizzesTaken: sql<number>`count(*)::int`,
				})
				.from(quizAttempts)
				.innerJoin(user, eq(user.id, quizAttempts.userId))
				.innerJoin(userCities, eq(userCities.userId, quizAttempts.userId))
				.where(eq(userCities.cityId, city.id))
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
						select qa.user_id from quiz_attempts qa
						inner join user_cities uc on uc.user_id = qa.user_id
						where uc.city_id = ${city.id}
						group by qa.user_id
						having sum(qa.score) > (
							select coalesce(sum(score), 0) from quiz_attempts where user_id = ${userId}
						)
					) better
				)::int`,
			})
			.from(quizAttempts)
			.innerJoin(userCities, eq(userCities.userId, quizAttempts.userId))
			.where(
				and(eq(quizAttempts.userId, userId), eq(userCities.cityId, city.id)),
			);
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

	return {
		city: { slug: city.slug, name: city.name, country: city.country },
		entries,
		me,
	};
}

export async function getUserCity(db: DB, userId: string) {
	const [row] = await db
		.select({ slug: cities.slug, name: cities.name, country: cities.country })
		.from(userCities)
		.innerJoin(cities, eq(cities.id, userCities.cityId))
		.where(eq(userCities.userId, userId));
	return row ?? null;
}

/** Join or switch cities — a user belongs to exactly one at a time. */
export async function joinCity(db: DB, userId: string, slug: string) {
	const [city] = await db.select().from(cities).where(eq(cities.slug, slug));
	if (!city) return null;

	await db
		.insert(userCities)
		.values({ userId, cityId: city.id })
		.onConflictDoUpdate({
			target: userCities.userId,
			set: { cityId: city.id, joinedAt: new Date() },
		});
	bust("leaderboard:"); // membership change affects city totals

	return { slug: city.slug, name: city.name, country: city.country };
}

interface GeneratedQuestionInput {
	prompt: string;
	choices: string[];
	correctIndex: number;
	explanation: string;
}

/** Persists a Gemini-generated quiz so it plays through the same grading/leaderboard path as curated ones. */
export async function insertGeneratedQuiz(
	db: DB,
	params: {
		title: string;
		category: string;
		questions: GeneratedQuestionInput[];
		createdBy: string;
	},
) {
	const slugBase = params.title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "")
		.slice(0, 40);
	const slug = `ai-${slugBase || "quiz"}-${crypto.randomUUID().slice(0, 8)}`;

	const [inserted] = await db
		.insert(quizzes)
		.values({
			slug,
			title: params.title,
			category: params.category,
			createdBy: params.createdBy,
		})
		.returning();

	await db.insert(questions).values(
		params.questions.map((q) => ({
			quizId: inserted.id,
			prompt: q.prompt,
			choices: q.choices,
			correctIndex: q.correctIndex,
			explanation: q.explanation,
		})),
	);

	return getQuizForPlay(db, slug);
}
