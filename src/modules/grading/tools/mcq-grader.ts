import { tool } from "ai";
import { z } from "zod";
import type { StructuredExam, StructuredQuestion } from "@/modules/structure/schema";
import type { QuestionEvaluation } from "../schema";

const OPTION_PATTERN = /\(?\s*([A-D])\s*\)?/i;

function normalizeOption(rawOption: string | null): string | null {
	if (!rawOption) {
		return null;
	}

	const match = rawOption.toUpperCase().match(OPTION_PATTERN);
	return match?.[1] ?? null;
}

function extractAnswerLineByQuestionId(studentAnswerSheet: string): Map<string, string> {
	const answerByQuestionId = new Map<string, string>();
	const lines = studentAnswerSheet.split(/\r?\n/);

	for (const line of lines) {
		const match = line.match(/^\s*(\d+)\.\s*(.+)$/);
		if (!match) {
			continue;
		}

		const questionId = match[1];
		const answerText = match[2];

		if (!questionId || !answerText) {
			continue;
		}

		answerByQuestionId.set(questionId, answerText.trim());
	}

	return answerByQuestionId;
}

function extractStudentOption(answerText: string | undefined): string | null {
	if (!answerText) {
		return null;
	}

	return normalizeOption(answerText);
}

function extractCorrectOption(question: StructuredQuestion): string | null {
	return normalizeOption(question.model_answer);
}

function isMcqQuestion(question: StructuredQuestion): boolean {
	return question.options.length > 0;
}

function gradeSingleMcqQuestion(question: StructuredQuestion, studentAnswerSheet: string): QuestionEvaluation {
	const answerByQuestionId = extractAnswerLineByQuestionId(studentAnswerSheet);
	const studentOption = extractStudentOption(answerByQuestionId.get(question.question_id));
	const correctOption = extractCorrectOption(question);
	const isCorrect = correctOption !== null && studentOption === correctOption;

	return {
		question_id: question.question_id,
		max_marks: question.max_marks,
		marks_awarded: isCorrect ? question.max_marks : 0,
		answer_type: "mcq",
		correctness: isCorrect ? "correct" : "incorrect",
		correct_option: correctOption,
		student_option: studentOption,
		steps_analysis: null,
		key_points_covered: null,
		key_points_missing: null,
		feedback: null,
	};
}

export function createMcqTool() {
	return tool({
		description: "Strictly grade MCQ questions by option matching only.",
		inputSchema: z.object({
			questionId: z.string(),
			questionText: z.string(),
			modelAnswer: z.string(),
			maxMarks: z.number(),
			options: z.array(z.string()),
			studentAnswerSheet: z.string(),
		}),
		execute: async ({ questionId, questionText, modelAnswer, maxMarks, options, studentAnswerSheet }) => {
			const result = gradeSingleMcqQuestion(
				{
					question_id: questionId,
					question_text: questionText,
					model_answer: modelAnswer,
					max_marks: maxMarks,
					options: options as StructuredQuestion["options"],
					marks_inferred: false,
					sub_questions: [],
				},
				studentAnswerSheet,
			);

			return result;
		},
	});
}

export async function gradeAllMcqWithTool(
	mcqQuestions: StructuredQuestion[],
	studentAnswerSheet: string,
): Promise<QuestionEvaluation[]> {
	const mcqTool = createMcqTool();

	if (!mcqTool.execute) {
		throw new Error("MCQ tool is missing execute function.");
	}

	return Promise.all(
		mcqQuestions.map(async (question) => {
			const result = await mcqTool.execute!(
				{
					questionId: question.question_id,
					questionText: question.question_text,
					modelAnswer: question.model_answer,
					maxMarks: question.max_marks,
					options: question.options,
					studentAnswerSheet,
				},
				{
					toolCallId: `mcq-${question.question_id}`,
					messages: [],
				},
			);

			if (result && typeof result === "object" && Symbol.asyncIterator in result) {
				let lastValue: QuestionEvaluation | null = null;
				for await (const chunk of result as AsyncIterable<QuestionEvaluation>) {
					lastValue = chunk;
				}

				if (!lastValue) {
					throw new Error(`MCQ tool stream returned no result for question ${question.question_id}.`);
				}

				return lastValue;
			}

			return result as QuestionEvaluation;
		}),
	);
}

export async function evaluateMcqQuestions({
	structuredExamData,
	studentAnswerSheet,
}: {
	structuredExamData: StructuredExam;
	studentAnswerSheet: string;
}): Promise<QuestionEvaluation[]> {
	const mcqQuestions = structuredExamData.sections.flatMap((section) =>
		section.questions.filter((question) => isMcqQuestion(question)),
	);
	return gradeAllMcqWithTool(mcqQuestions, studentAnswerSheet);
}

export function splitExamByQuestionType(structuredExamData: StructuredExam) {
	const nonMcqSections = structuredExamData.sections
		.map((section) => ({
			...section,
			questions: section.questions.filter((question) => !isMcqQuestion(question)),
		}))
		.filter((section) => section.questions.length > 0);

	const nonMcqTotalQuestions = nonMcqSections.reduce((count, section) => count + section.questions.length, 0);
	const nonMcqTotalMarks = nonMcqSections.reduce(
		(total, section) =>
			total + section.questions.reduce((sectionTotal, question) => sectionTotal + question.max_marks, 0),
		0,
	);

	return {
		nonMcqExam: {
			sections: nonMcqSections,
			metadata: {
				total_questions: nonMcqTotalQuestions,
				total_marks: nonMcqTotalMarks,
			},
		},
	};
}
