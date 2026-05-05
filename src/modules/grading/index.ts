import { GRADE_MODEL } from "@/config/constant";
import { logLlmResponse } from "@/core/utils/llm-response-logger";
import { getStoredStructuredExamData, getStructuredExamData } from "../structure";
import { MODEL_ANSWER, QUESTIONS } from "../structure/input";
import { buildFinalEvaluation, buildGradingLogPayload, mergeQuestionEvaluations } from "./evaluation";
import { requestNonMcqEvaluation } from "./llm";
import { type GradingRepository, gradingRepository } from "./repository";
import { applyRubricPolicyToNonMcqEvaluation } from "./rubric";
import type { Evaluation } from "./schema";
import { STUDENT_ANSWER_SHEET } from "./student-sheet";
import { evaluateMcqQuestions, splitExamByQuestionType } from "./tools";

type GradeStudentAnswerSheetInput = {
	questionPaper: string;
	modelAnswers: string;
	studentAnswerSheet: string;
	ocrRequestId?: number;
	repository?: GradingRepository;
};

type GradeStoredStudentAnswerSheetInput = {
	ocrRequestId: number;
	studentAnswerSheet: string;
	repository?: GradingRepository;
};

async function evaluateStructuredExam(
	structuredExamData: Awaited<ReturnType<typeof getStructuredExamData>>,
	studentAnswerSheet: string,
	options: { ocrRequestId?: number; repository?: GradingRepository } = {},
): Promise<Evaluation> {
	const repository = options.repository ?? gradingRepository;
	const mcqEvaluations = await evaluateMcqQuestions({ structuredExamData, studentAnswerSheet });
	const { nonMcqExam } = splitExamByQuestionType(structuredExamData);

	const aiEvaluation = applyRubricPolicyToNonMcqEvaluation(
		await requestNonMcqEvaluation({
			nonMcqExam,
			studentAnswerSheet,
		}),
	);

	const mergedEvaluation = mergeQuestionEvaluations(mcqEvaluations, aiEvaluation.evaluation);
	const finalEvaluation = buildFinalEvaluation({
		aiEvaluation,
		mergedEvaluation,
	});

	const logPayload = buildGradingLogPayload({
		finalEvaluation,
		mcqEvaluations,
		nonMcqEvaluations: aiEvaluation.evaluation,
	});

	await logLlmResponse({
		module: "grading",
		model: GRADE_MODEL,
		response: logPayload.response,
		metadata: logPayload.metadata,
	});

	if (options.ocrRequestId !== undefined) {
		await repository.saveEvaluationForOcrRequest({
			ocrRequestId: options.ocrRequestId,
			evaluation: finalEvaluation,
		});
	}

	return finalEvaluation;
}

/**
 * Evaluates a student's answer sheet using hybrid grading.
 *
 * MCQ questions are graded by deterministic tool logic, and non-MCQ questions
 * are graded by the model using structured output.
 *
 * @param questionPaper Raw question paper text.
 * @param modelAnswers Raw model answer text.
 * @param studentAnswerSheet Raw student answer sheet text.
 * @returns The final merged and validated evaluation result.
 */
export async function gradeStudentAnswerSheet({
	questionPaper,
	modelAnswers,
	studentAnswerSheet,
	ocrRequestId,
	repository,
}: GradeStudentAnswerSheetInput): Promise<Evaluation> {
	const structuredExamData = await getStructuredExamData(questionPaper, modelAnswers, {
		ocrRequestId,
	});

	return evaluateStructuredExam(structuredExamData, studentAnswerSheet, {
		ocrRequestId,
		repository,
	});
}

export async function gradeStoredStudentAnswerSheet({
	ocrRequestId,
	studentAnswerSheet,
	repository,
}: GradeStoredStudentAnswerSheetInput): Promise<Evaluation> {
	const structuredExamData = await getStoredStructuredExamData(ocrRequestId);

	if (!structuredExamData) {
		throw new Error(`Structured exam not found for OCR request ${ocrRequestId}`);
	}

	return evaluateStructuredExam(structuredExamData, studentAnswerSheet, {
		ocrRequestId,
		repository,
	});
}

/**
 * Runs a local grading demo using sample inputs and prints the result.
 *
 * @returns Promise that resolves when demo execution completes.
 */
export async function runGradingDemo() {
	const result = await gradeStudentAnswerSheet({
		questionPaper: QUESTIONS,
		modelAnswers: MODEL_ANSWER,
		studentAnswerSheet: STUDENT_ANSWER_SHEET,
	});

	console.log(result);
}

if (import.meta.main) {
	await runGradingDemo();
}
