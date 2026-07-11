import { describe, expect, it } from "vitest";
import { validateGeneratedQuiz } from "../lib/gemini";

function validQuestion(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		prompt: "What causes coral bleaching?",
		choices: ["Heat stress", "Plastic", "Overfishing", "Sunscreen"],
		correctIndex: 0,
		explanation: "Heat stress makes corals expel their algae.",
		...overrides,
	};
}

function validQuiz(questions = [validQuestion()]) {
	return {
		title: "Ocean Health",
		category: "ecosystems",
		questions,
	};
}

describe("validateGeneratedQuiz", () => {
	it("accepts a well-formed quiz", () => {
		const quiz = validateGeneratedQuiz(validQuiz());
		expect(quiz?.title).toBe("Ocean Health");
		expect(quiz?.questions).toHaveLength(1);
	});

	it("rejects non-object input", () => {
		expect(validateGeneratedQuiz(null)).toBeNull();
		expect(validateGeneratedQuiz("a string")).toBeNull();
		expect(validateGeneratedQuiz(42)).toBeNull();
	});

	it("rejects a missing or empty title", () => {
		expect(validateGeneratedQuiz(validQuiz())).not.toBeNull();
		const { title, ...rest } = validQuiz();
		expect(validateGeneratedQuiz(rest)).toBeNull();
		expect(validateGeneratedQuiz({ ...validQuiz(), title: "  " })).toBeNull();
	});

	it("rejects a question without exactly 4 choices", () => {
		const quiz = validQuiz([validQuestion({ choices: ["a", "b", "c"] })]);
		expect(validateGeneratedQuiz(quiz)).toBeNull();
	});

	it("rejects a correctIndex out of range", () => {
		expect(
			validateGeneratedQuiz(validQuiz([validQuestion({ correctIndex: 4 })])),
		).toBeNull();
		expect(
			validateGeneratedQuiz(validQuiz([validQuestion({ correctIndex: -1 })])),
		).toBeNull();
		expect(
			validateGeneratedQuiz(validQuiz([validQuestion({ correctIndex: 1.5 })])),
		).toBeNull();
	});

	it("rejects an empty explanation", () => {
		const quiz = validQuiz([validQuestion({ explanation: "" })]);
		expect(validateGeneratedQuiz(quiz)).toBeNull();
	});

	it("rejects a quiz with no questions", () => {
		expect(validateGeneratedQuiz(validQuiz([]))).toBeNull();
	});
});
