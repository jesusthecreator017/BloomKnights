import { ENVIRONMENT_FACTS } from "./environment-facts";

const MODEL = "gemini-2.5-flash";
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
		super("Gemini quiz generation isn't configured — set GEMINI_API_KEY");
		this.name = "GeminiNotConfiguredError";
	}
}

export class GeminiRequestError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GeminiRequestError";
	}
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

function buildPrompt({
	topic,
	existingTitles,
	emissionsContext,
	actContext,
}: GenerateQuizOptions): string {
	const factSheet = ENVIRONMENT_FACTS.map((f) => `- ${f}`).join("\n");
	const avoid =
		existingTitles.length > 0
			? `Avoid repeating the topic of these existing quizzes: ${existingTitles.join(", ")}.`
			: "";

	const topicInstruction = topic
		? `The user specifically asked for a quiz about: "${topic}". Stay focused on that topic.`
		: "Pick one interesting, specific environmental or clean-energy subtopic not already covered.";

	return `You are a quiz writer for BloomKnights, an environmental-awareness app. Write one multiple-choice quiz with exactly ${QUESTIONS_PER_QUIZ} questions.

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
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) throw new GeminiNotConfiguredError();

	const res = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			signal: AbortSignal.timeout(30_000),
			body: JSON.stringify({
				contents: [{ parts: [{ text: buildPrompt(options) }] }],
				generationConfig: {
					responseMimeType: "application/json",
					responseSchema: RESPONSE_SCHEMA,
				},
			}),
		},
	).catch((err) => {
		throw new GeminiRequestError(
			err instanceof Error ? err.message : "Gemini request failed",
		);
	});

	if (!res.ok) {
		throw new GeminiRequestError(`Gemini responded ${res.status}`);
	}

	const body = (await res.json()) as {
		candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
	};
	const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
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
