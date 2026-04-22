import { z } from "zod";
import { AnswerTypeSchema, QuestionOptionSchema, QuestionTypeSchema } from "@/modules/structure/schema";

export const EvaluationVerdictSchema = z
  .enum(["correct", "partially_correct", "incorrect", "not_attempted"])
  .describe("Normalized grading outcome for one question.");

export const RubricCriterionSchema = z
  .object({
    criterion: z.string().min(1).describe("Short rubric criterion such as 'method', 'accuracy', or 'final answer'."),
    awardedMarks: z.number().nonnegative().describe("Marks awarded for this criterion."),
    maxMarks: z.number().nonnegative().describe("Maximum marks possible for this criterion."),
    rationale: z.string().min(1).describe("Why these marks were awarded for this criterion."),
  })
  .describe("Criterion-wise rubric item used mainly for non-MCQ questions.");

export const QuestionEvaluationSchema = z
  .object({
    questionRef: z.string().min(1).describe("Question reference such as '15' or '16(ii)'."),
    questionId: z.number().int().positive().optional(),
    questionType: QuestionTypeSchema,
    maxMarks: z.number().nonnegative(),
    awardedMarks: z.number().nonnegative(),
    verdict: EvaluationVerdictSchema,
    matchedModelAnswer: z.boolean().describe("Whether the response substantially matches the expected answer."),
    rationale: z.string().min(1).describe("Concise grading explanation."),
    mistakes: z.array(z.string()).optional().describe("Key mistakes identified in the student's answer."),
    improvementSuggestions: z
      .array(z.string())
      .optional()
      .describe("Concrete, actionable ways for the student to improve."),
    rubricBreakdown: z
      .array(RubricCriterionSchema)
      .optional()
      .describe("Criterion-wise marks, primarily for descriptive/non-MCQ answers."),
  })
  .describe("Final grading result for one question.");

export const EvaluationSummarySchema = z
  .object({
    overallFeedback: z.string().min(1).describe("Overall summary of the student's performance."),
    strengths: z.array(z.string()).optional().describe("High-level strengths demonstrated across the paper."),
    priorityImprovements: z.array(z.string()).optional().describe("Top improvement areas for the student."),
  })
  .describe("Overall evaluation summary.");

export const EngineEvaluationSchema = z
  .object({
    questionResults: z.array(QuestionEvaluationSchema).describe("Per-question grading results."),
    totalMarks: z.number().nonnegative(),
    maxMarks: z.number().nonnegative(),
    percentage: z.number().nonnegative(),
    summary: EvaluationSummarySchema,
  })
  .describe("Final engine evaluation output for one student submission.");

export const EngineQuestionContextSchema = z
  .object({
    questionId: z.number().int().positive(),
    questionRef: z.string().min(1),
    questionType: QuestionTypeSchema,
    answerType: AnswerTypeSchema.optional(),
    section: z.string().optional(),
    question: z.string().min(1),
    marks: z.number().nonnegative(),
    options: z.array(QuestionOptionSchema).optional(),
    modelAnswer: z.string().optional(),
    keySteps: z.array(z.string()).optional(),
    finalValue: z.string().optional(),
    studentResponse: z.string().min(1),
  })
  .describe("Structured context for one descriptive question evaluation.");

export const DescriptiveEvaluationBatchSchema = z.object({
  questionResults: z
    .array(QuestionEvaluationSchema)
    .describe("Evaluation results for the supplied descriptive questions only."),
  summary: EvaluationSummarySchema,
});

export type QuestionEvaluation = z.infer<typeof QuestionEvaluationSchema>;
export type EngineEvaluation = z.infer<typeof EngineEvaluationSchema>;
export type EngineQuestionContext = z.infer<typeof EngineQuestionContextSchema>;
