import { GoogleGenAI } from "@google/genai";
import { getEnvironmentFacts } from "./environment-facts";
import { type EcoEvent, validateEcoEvents } from "./events";

const MODEL = "gemini-3.5-flash";
const QUESTIONS_PER_QUIZ = 5;

export interface GeneratedQuestion {
	prompt: string;
	choices: string[];
	correctIndex: number;
	explanation: string;
}

export interface GeneratedQuiz {
	title: string;
	category: string;
	questions: GeneratedQuestion[];
}

export class GeminiNotConfiguredError extends Error {
	constructor() {
		super("Gemini isn't configured — set GEMINI_API_KEY");
		this.name = "GeminiNotConfiguredError";
	}
}

export class GeminiRequestError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GeminiRequestError";
	}
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) throw new GeminiNotConfiguredError();
	if (!client) client = new GoogleGenAI({ apiKey });
	return client;
}

const RESPONSE_SCHEMA = {
	type: "object",
	properties: {
		title: { type: "string" },
		category: { type: "string" },
		questions: {
			type: "array",
			minItems: QUESTIONS_PER_QUIZ,
			maxItems: QUESTIONS_PER_QUIZ,
			items: {
				type: "object",
				properties: {
					prompt: { type: "string" },
					choices: {
						type: "array",
						minItems: 4,
						maxItems: 4,
						items: { type: "string" },
					},
					correctIndex: { type: "integer" },
					explanation: { type: "string" },
				},
				required: ["prompt", "choices", "correctIndex", "explanation"],
			},
		},
	},
	required: ["title", "category", "questions"],
} as const;

interface GenerateQuizOptions {
	/** A specific topic the user asked for. Omitted for "reshuffle" (random). */
	topic?: string;
	/** Titles of quizzes that already exist, so the model avoids duplicates. */
	existingTitles: string[];
	/** Optional live USA emissions blurb, pulled from the app's own /data page cache. */
	emissionsContext?: string;
	/** Static summary of the app's Act page actions, for grounding. */
	actContext: string;
}

/** Pure — no network. Safe to call on untrusted model output before it touches the DB. */
export function validateGeneratedQuiz(json: unknown): GeneratedQuiz | null {
	if (typeof json !== "object" || json === null) return null;
	const obj = json as Record<string, unknown>;

	const title = obj.title;
	const category = obj.category;
	const questions = obj.questions;
	if (typeof title !== "string" || title.trim().length === 0) return null;
	if (typeof category !== "string" || category.trim().length === 0) return null;
	if (!Array.isArray(questions) || questions.length === 0) return null;

	const parsedQuestions: GeneratedQuestion[] = [];
	for (const q of questions) {
		if (typeof q !== "object" || q === null) return null;
		const question = q as Record<string, unknown>;
		const prompt = question.prompt;
		const choices = question.choices;
		const correctIndex = question.correctIndex;
		const explanation = question.explanation;

		if (typeof prompt !== "string" || prompt.trim().length === 0) return null;
		if (
			!Array.isArray(choices) ||
			choices.length !== 4 ||
			!choices.every((c) => typeof c === "string" && c.trim().length > 0)
		) {
			return null;
		}
		if (
			typeof correctIndex !== "number" ||
			!Number.isInteger(correctIndex) ||
			correctIndex < 0 ||
			correctIndex > 3
		) {
			return null;
		}
		if (typeof explanation !== "string" || explanation.trim().length === 0) {
			return null;
		}

		parsedQuestions.push({
			prompt,
			choices: choices as string[],
			correctIndex,
			explanation,
		});
	}

	return { title, category, questions: parsedQuestions };
}

function buildPrompt(
	{ topic, existingTitles, emissionsContext, actContext }: GenerateQuizOptions,
	facts: readonly string[],
): string {
	const factSheet = facts.map((f) => `- ${f}`).join("\n");
	const avoid =
		existingTitles.length > 0
			? `Avoid repeating the topic of these existing quizzes: ${existingTitles.join(", ")}.`
			: "";

	const topicInstruction = topic
		? `The user specifically asked for a quiz about: "${topic}". Stay focused on that topic.`
		: "Pick one interesting, specific environmental or clean-energy subtopic not already covered.";

	return `You are a quiz writer for Ecoverse, an environmental-awareness app. Write one multiple-choice quiz with exactly ${QUESTIONS_PER_QUIZ} questions.

${topicInstruction}
${avoid}

Ground every question in real, verifiable facts. Use this fact sheet as your primary source, plus your own knowledge of EPA/UN/NOAA/IEA-level data — never invent statistics:
${factSheet}

Additional app context to optionally draw on:
- Actions the app recommends: ${actContext}
${emissionsContext ? `- Live emissions data: ${emissionsContext}` : ""}

Each question needs exactly 4 answer choices, one correct index (0-3), and a 1-2 sentence factual explanation naming the source (e.g. "according to the EPA..."). Give the quiz a short, specific title and a lowercase-hyphenated category slug (e.g. "clean-energy", "climate-science").`;
}

export async function generateQuiz(
	options: GenerateQuizOptions,
): Promise<GeneratedQuiz> {
	const genai = getClient();

	const interaction = await genai.interactions
		.create({
			model: MODEL,
			input: buildPrompt(options, await getEnvironmentFacts()),
			response_format: {
				type: "text",
				mime_type: "application/json",
				schema: RESPONSE_SCHEMA,
			},
		})
		.catch((err) => {
			throw new GeminiRequestError(
				err instanceof Error ? err.message : "Gemini request failed",
			);
		});

	const text = interaction.output_text;
	if (!text) throw new GeminiRequestError("Gemini returned no content");

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new GeminiRequestError("Gemini returned invalid JSON");
	}

	const quiz = validateGeneratedQuiz(parsed);
	if (!quiz)
		throw new GeminiRequestError("Gemini returned an invalid quiz shape");
	return quiz;
}

/**
 * Real upcoming eco events near a point, found via Gemini with Google Search
 * grounding. Search grounding can't be combined with a structured-output
 * schema, so the prompt demands raw JSON and the output is validated with
 * `validateEcoEvents` before anything trusts it. Callers cache + fall back.
 */
export async function findLiveEvents(
	lat: number,
	lng: number,
): Promise<EcoEvent[]> {
	const genai = getClient();

	const prompt = `Use Google Search to find real, upcoming (within the next 60 days) environmental / clean-energy / volunteering events near latitude ${lat.toFixed(3)}, longitude ${lng.toFixed(3)} — cleanups, tree plantings, farmers/eco markets, climate talks, recycling drives.

Respond with ONLY a raw JSON array (no markdown fences, no prose) of 5-10 events, each exactly:
{"id": "<kebab-case-slug>", "name": "...", "description": "<1-2 sentences>", "category": "<cleanup|planting|market|talk|recycling|other>", "date": "<YYYY-MM-DD>", "lat": <number>, "lng": <number>, "city": "...", "url": "<event page URL from search>", "volunteerUrl": "<signup URL if any, else omit>"}

Only include events you actually found via search with a real URL. Coordinates should be the venue's approximate location. If you cannot verify enough events, return fewer — never invent one.`;

	const interaction = await genai.interactions
		.create({
			model: MODEL,
			input: prompt,
			tools: [{ type: "google_search" }],
		})
		.catch((err) => {
			throw new GeminiRequestError(
				err instanceof Error ? err.message : "Gemini request failed",
			);
		});

	const text = interaction.output_text;
	if (!text) throw new GeminiRequestError("Gemini returned no content");

	// tolerate ```json fences despite the prompt
	const stripped = text
		.trim()
		.replace(/^```(?:json)?\s*/i, "")
		.replace(/\s*```$/, "");

	let parsed: unknown;
	try {
		parsed = JSON.parse(stripped);
	} catch {
		throw new GeminiRequestError("Gemini returned invalid JSON for events");
	}

	const events = validateEcoEvents(parsed);
	if (events.length === 0)
		throw new GeminiRequestError("Gemini returned no usable events");
	return events;
}

export interface AskContext {
	kind: "event" | "initiative" | "location";
	name?: string;
	description?: string;
	lat: number;
	lng: number;
	/** Freeform live data already shown to the user (AQI, UV, category, etc.), so the answer doesn't repeat it. */
	liveData?: string;
}

function buildAskPrompt(
	question: string,
	context: AskContext,
	facts: readonly string[],
): string {
	const factSheet = facts.map((f) => `- ${f}`).join("\n");
	const subject =
		context.kind === "location"
			? `a map location at (${context.lat.toFixed(3)}, ${context.lng.toFixed(3)})`
			: `${context.kind === "event" ? "an event" : "an initiative"} called "${context.name}"`;

	return `You are Ecoverse's environmental assistant, answering a question about ${subject} that the user is currently looking at on the map.

${context.description ? `Description: ${context.description}` : ""}
${context.liveData ? `Live data already shown to the user: ${context.liveData}` : ""}

Ground factual claims in real, verifiable data. Use this fact sheet as your primary source, plus your own knowledge of EPA/UN/NOAA-level data — never invent statistics:
${factSheet}

Answer the user's question in 2-4 sentences, conversationally, without repeating information they can already see on screen.

User's question: "${question}"`;
}

/** Free-form one-shot Q&A grounded in whatever the user is currently looking at. Not cached — every question is different. */
export async function askGemini(
	question: string,
	context: AskContext,
): Promise<string> {
	const genai = getClient();

	const interaction = await genai.interactions
		.create({
			model: MODEL,
			input: buildAskPrompt(question, context, await getEnvironmentFacts()),
		})
		.catch((err) => {
			throw new GeminiRequestError(
				err instanceof Error ? err.message : "Gemini request failed",
			);
		});

	const text = interaction.output_text;
	if (!text) throw new GeminiRequestError("Gemini returned no content");
	return text;
}
