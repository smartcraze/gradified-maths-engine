import type { NonMcqEvaluationOutput } from "./llm";
import { type Evaluation, EvaluationSchema, type QuestionEvaluation } from "./schema";

/**
 * Merges MCQ and non-MCQ evaluations in deterministic question order.
 */
export function mergeQuestionEvaluations(
	mcqEvaluations: QuestionEvaluation[],
	nonMcqEvaluations: QuestionEvaluation[],
): QuestionEvaluation[] {
	return [...mcqEvaluations, ...nonMcqEvaluations].sort((firstQuestion, secondQuestion) => {
		const firstQuestionNumber = Number(firstQuestion.question_id);
		const secondQuestionNumber = Number(secondQuestion.question_id);

		if (Number.isNaN(firstQuestionNumber) || Number.isNaN(secondQuestionNumber)) {
			return firstQuestion.question_id.localeCompare(secondQuestion.question_id);
		}

		return firstQuestionNumber - secondQuestionNumber;
	});
}

/**
 * Builds and validates the final evaluation object for a grading run.
 */
export function buildFinalEvaluation({
	aiEvaluation,
	mergedEvaluation,
}: {
	aiEvaluation: NonMcqEvaluationOutput;
	mergedEvaluation: QuestionEvaluation[];
}): Evaluation {
	const totalMaxMarks = mergedEvaluation.reduce((total, question) => total + question.max_marks, 0);
	const totalAwardedMarks = mergedEvaluation.reduce((total, question) => total + question.marks_awarded, 0);
	const percentage = totalMaxMarks === 0 ? 0 : Number(((totalAwardedMarks / totalMaxMarks) * 100).toFixed(2));

	return EvaluationSchema.parse({
		student: aiEvaluation.student,
		summary: {
			total_questions: mergedEvaluation.length,
			total_max_marks: totalMaxMarks,
			total_awarded_marks: totalAwardedMarks,
			percentage,
		},
		evaluation: mergedEvaluation,
		overall_feedback: aiEvaluation.overall_feedback,
	});
}

/**
 * Creates a compact log payload for grading output and run-level metadata.
 */
export function buildGradingLogPayload({
	finalEvaluation,
	mcqEvaluations,
	nonMcqEvaluations,
}: {
	finalEvaluation: Evaluation;
	mcqEvaluations: QuestionEvaluation[];
	nonMcqEvaluations: QuestionEvaluation[];
}) {
	return {
		response: {
			final_summary: finalEvaluation.summary,
			student: finalEvaluation.student,
			overall_feedback: finalEvaluation.overall_feedback,
			mcq_evaluation: mcqEvaluations,
			non_mcq_evaluation: nonMcqEvaluations,
		},
		metadata: {
			totalQuestions: finalEvaluation.summary.total_questions,
			mcqQuestionCount: mcqEvaluations.length,
			nonMcqQuestionCount: nonMcqEvaluations.length,
		},
	};
}
