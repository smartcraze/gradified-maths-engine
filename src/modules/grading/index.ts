import { GRADE_MODEL } from "@/config/constant";
import { logLlmResponse } from "@/core/utils/llm-response-logger";
import { getStructuredExamData } from "../structure";
import { MODEL_ANSWER, QUESTIONS } from "../structure/input";
import { buildFinalEvaluation, buildGradingLogPayload, mergeQuestionEvaluations } from "./evaluation";
import { requestNonMcqEvaluation } from "./llm";
import { applyRubricPolicyToNonMcqEvaluation } from "./rubric";
import type { Evaluation } from "./schema";
import { STUDENT_ANSWER_SHEET } from "./student-sheet";
import { evaluateMcqQuestions, splitExamByQuestionType } from "./tools";

type GradeStudentAnswerSheetInput = {
	questionPaper: string;
	modelAnswers: string;
	studentAnswerSheet: string;
};

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
}: GradeStudentAnswerSheetInput): Promise<Evaluation> {
	const structuredExamData = await getStructuredExamData(questionPaper, modelAnswers);
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

	return finalEvaluation;
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
