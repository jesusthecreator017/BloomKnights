import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";

// ---------- better-auth tables (canonical drizzle schema) ----------

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull().default(false),
	image: text("image"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- quiz + leaderboard ----------

export const quizzes = pgTable("quizzes", {
	id: serial("id").primaryKey(),
	slug: text("slug").notNull().unique(),
	title: text("title").notNull(),
	category: text("category").notNull(),
	// null for the 8 curated standard quizzes; set for Gemini-generated ones
	createdBy: text("created_by").references(() => user.id, {
		onDelete: "set null",
	}),
});

export const questions = pgTable(
	"questions",
	{
		id: serial("id").primaryKey(),
		quizId: integer("quiz_id")
			.notNull()
			.references(() => quizzes.id, { onDelete: "cascade" }),
		prompt: text("prompt").notNull(),
		choices: jsonb("choices").$type<Array<string>>().notNull(),
		correctIndex: integer("correct_index").notNull(),
		points: integer("points").notNull().default(10),
		explanation: text("explanation").notNull(),
	},
	// every quiz play/submit filters questions by quiz_id (FKs aren't auto-indexed)
	(t) => [index("questions_quiz_id_idx").on(t.quizId)],
);

export const quizAttempts = pgTable(
	"quiz_attempts",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		quizId: integer("quiz_id")
			.notNull()
			.references(() => quizzes.id, { onDelete: "cascade" }),
		score: integer("score").notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	// one attempt per user per quiz — points can't be farmed by retaking.
	// The composite unique also indexes user_id-led leaderboard scans; add
	// quiz_id for the FK/cascade side.
	(t) => [
		unique().on(t.userId, t.quizId),
		index("quiz_attempts_quiz_id_idx").on(t.quizId),
	],
);

// ---------- cities + city leaderboard ----------

export const cities = pgTable("cities", {
	id: serial("id").primaryKey(),
	slug: text("slug").notNull().unique(),
	name: text("name").notNull(),
	country: text("country").notNull(),
});

export const userCities = pgTable(
	"user_cities",
	{
		// one city per user — joining a new one replaces the old membership
		userId: text("user_id")
			.primaryKey()
			.references(() => user.id, { onDelete: "cascade" }),
		cityId: integer("city_id")
			.notNull()
			.references(() => cities.id, { onDelete: "cascade" }),
		joinedAt: timestamp("joined_at").notNull().defaultNow(),
	},
	// city leaderboard aggregation filters/groups by city_id
	(t) => [index("user_cities_city_id_idx").on(t.cityId)],
);

// ---------- external data cache ----------

export const emissionsCache = pgTable("emissions_cache", {
	country: text("country").primaryKey(),
	data: jsonb("data").notNull(),
	fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
});
