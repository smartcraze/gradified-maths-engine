import { EvaluationStatus, type Prisma } from "@/generated/prisma/client";
import { upsertEvaluationResult } from "@/modules/structure/repository";
import { evaluateStructuredSubmission } from "./index";
import { getSubmissionForEvaluation } from "./repository";

export type EvaluateSubmissionInput = {
  submissionId: string;
  forceRegrade?: boolean;
};

export async function evaluateSubmission(input: EvaluateSubmissionInput) {
  const submission = await getSubmissionForEvaluation(input.submissionId);
  if (!submission) {
    throw new Error(`Student submission not found for submissionId: ${input.submissionId}`);
  }

  if (submission.evaluation && !input.forceRegrade) {
    return {
      source: "cache" as const,
      submission,
      evaluation: submission.evaluation,
    };
  }

  const evaluated = await evaluateStructuredSubmission({
    structuredQuestionPaper: submission.exam.structuredQuestionPaper,
    structuredModelAnswer: submission.exam.structuredModelAnswer,
    structuredStudentSheet: submission.structuredStudentSheet,
  });

  const questionWiseMarks = evaluated.questionResults.map((result) => ({
    questionRef: result.questionRef,
    maxMarks: result.maxMarks,
    awardedMarks: result.awardedMarks,
    verdict: result.verdict,
    matchedModelAnswer: result.matchedModelAnswer,
  }));

  const rubricBreakdown = evaluated.questionResults
    .filter((result) => result.rubricBreakdown && result.rubricBreakdown.length > 0)
    .map((result) => ({
      questionRef: result.questionRef,
      rubricBreakdown: result.rubricBreakdown,
    }));

  const feedback = {
    summary: evaluated.summary,
    perQuestion: evaluated.questionResults.map((result) => ({
      questionRef: result.questionRef,
      rationale: result.rationale,
      mistakes: result.mistakes ?? [],
      improvementSuggestions: result.improvementSuggestions ?? [],
    })),
  };

  const saved = await upsertEvaluationResult({
    submissionId: submission.id,
    totalMarks: evaluated.totalMarks.toFixed(2),
    maxMarks: evaluated.maxMarks.toFixed(2),
    percentage: evaluated.percentage.toFixed(2),
    questionWiseMarks: questionWiseMarks as Prisma.InputJsonValue,
    rubricBreakdown: rubricBreakdown as Prisma.InputJsonValue,
    feedback: feedback as Prisma.InputJsonValue,
    status: EvaluationStatus.COMPLETED,
  });

  return {
    source: "fresh" as const,
    submission,
    evaluation: saved,
    result: evaluated,
  };
}
