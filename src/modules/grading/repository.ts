import { db } from "@/config/db";
import { GradedSolutions, questionSolutions } from "@/db/schema";
import { structureRepository } from "../structure/repository";
import type { StructuredExam, StructuredQuestion } from "../structure/schema";
import type { Evaluation, QuestionEvaluation } from "./schema";

type QuestionSolutionMetadata = {
	question_id: string;
	answer_type: QuestionEvaluation["answer_type"];
	structure_question: StructuredQuestion;
	question_evaluation: QuestionEvaluation;
};

type GradedSolutionMetadata = {
	question_evaluation: QuestionEvaluation;
	evaluation_summary: Evaluation["summary"];
	overall_feedback: string;
};

export type GradingRepository = {
	saveEvaluationForOcrRequest(input: { ocrRequestId: number; evaluation: Evaluation }): Promise<Evaluation>;
};

function serializeFeedback(feedback: QuestionEvaluation["feedback"]): string | null {
	if (!feedback) {
		return null;
	}

	return [feedback.strengths, feedback.improvements].filter(Boolean).join("\n\n");
}

function normalizeStoredMarks(marksAwarded: number): number {
	return Math.round(marksAwarded);
}

function findQuestionById(structuredExam: StructuredExam, questionId: string): StructuredQuestion | null {
	for (const section of structuredExam.sections) {
		for (const question of section.questions) {
			const match = findQuestionByIdInNode(question, questionId);
			if (match) {
				return match;
			}
		}
	}

	return null;
}

function findQuestionByIdInNode(question: StructuredQuestion, questionId: string): StructuredQuestion | null {
	if (question.question_id === questionId) {
		return question;
	}

	for (const subQuestion of question.sub_questions) {
		const match = findQuestionByIdInNode(subQuestion, questionId);
		if (match) {
			return match;
		}
	}

	return null;
}

function buildQuestionSolutionMetadata(input: {
	questionEvaluation: QuestionEvaluation;
	structureQuestion: StructuredQuestion;
}): QuestionSolutionMetadata {
	return {
		question_id: input.questionEvaluation.question_id,
		answer_type: input.questionEvaluation.answer_type,
		structure_question: input.structureQuestion,
		question_evaluation: input.questionEvaluation,
	};
}

function buildGradedSolutionMetadata(
	questionEvaluation: QuestionEvaluation,
	evaluationSummary: Evaluation["summary"],
	overallFeedback: string,
): GradedSolutionMetadata {
	return {
		question_evaluation: questionEvaluation,
		evaluation_summary: evaluationSummary,
		overall_feedback: overallFeedback,
	};
}

export function createGradingRepository(database = db): GradingRepository {
	return {
		async saveEvaluationForOcrRequest({ ocrRequestId, evaluation }) {
			const examRecord = await structureRepository.findStructuredExamPaperRecordByOcrRequestId(ocrRequestId);

			if (!examRecord) {
				throw new Error(`Structured exam not found for OCR request ${ocrRequestId}`);
			}

			await database.transaction(async (transaction) => {
				for (const questionEvaluation of evaluation.evaluation) {
					const structuredQuestion = findQuestionById(examRecord.structure_question, questionEvaluation.question_id);

					if (!structuredQuestion) {
						throw new Error(`Question not found in structured exam for question ${questionEvaluation.question_id}`);
					}

					const [solutionRow] = await transaction
						.insert(questionSolutions)
						.values({
							question_paper_id: examRecord.id,
							solution: structuredQuestion.model_answer,
							metadata: buildQuestionSolutionMetadata({
								questionEvaluation,
								structureQuestion: structuredQuestion,
							}),
						})
						.returning({ id: questionSolutions.id });

					if (!solutionRow) {
						throw new Error(`Failed to save solution for question ${questionEvaluation.question_id}`);
					}

					await transaction.insert(GradedSolutions).values({
						question_solution_id: solutionRow.id,
						question_paper_id: examRecord.id,
						student_name: evaluation.student?.name ?? null,
						marks: normalizeStoredMarks(questionEvaluation.marks_awarded),
						feedback: serializeFeedback(questionEvaluation.feedback),
						metadata: buildGradedSolutionMetadata(questionEvaluation, evaluation.summary, evaluation.overall_feedback),
					});
				}
			});

			return evaluation;
		},
	};
}

export const gradingRepository = createGradingRepository();
