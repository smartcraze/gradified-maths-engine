import { z } from "zod";

export const sectionSchema = z.enum(["A", "B", "C"]);
export type ExamSection = z.infer<typeof sectionSchema>;

export const evaluationQuestionTypeSchema = z.enum(["mcq", "short", "long"]);
export type EvaluationQuestionType = z.infer<typeof evaluationQuestionTypeSchema>;

const answerContentSchema = z
  .object({
    text: z.string().trim().optional(),
    latex: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    const hasText = Boolean(value.text && value.text.length > 0);
    const hasLatex = Boolean(value.latex && value.latex.length > 0);

    if (!hasText && !hasLatex) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either text or latex is required.",
      });
    }
  });

export const questionSchema = z
  .object({
    questionNo: z.string().min(1),
    section: sectionSchema,
    maxMarks: z.number().positive(),
    type: evaluationQuestionTypeSchema,
    topic: z.string().trim().optional(),
  })
  .and(answerContentSchema);

export type Question = z.infer<typeof questionSchema>;

export const modelAnswerSchema = z
  .object({
    questionNo: z.string().min(1),
    section: sectionSchema,
    type: evaluationQuestionTypeSchema,
    mcqCorrectOption: z.string().trim().optional(),
    answerText: z.string().trim().optional(),
    answerLatex: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    const isMcq = value.type === "mcq";
    const hasMcqOption = Boolean(value.mcqCorrectOption && value.mcqCorrectOption.length > 0);
    const hasAnswerContent =
      Boolean(value.answerText && value.answerText.length > 0) ||
      Boolean(value.answerLatex && value.answerLatex.length > 0);

    if (isMcq && !hasMcqOption) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "mcqCorrectOption is required for mcq model answers.",
      });
    }

    if (!isMcq && !hasAnswerContent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "answerText or answerLatex is required for non-MCQ model answers.",
      });
    }
  });

export type ModelAnswer = z.infer<typeof modelAnswerSchema>;

export const studentAnswerSchema = z
  .object({
    questionNo: z.string().min(1),
    section: sectionSchema,
    selectedOption: z.string().trim().optional(),
    answerText: z.string().trim().optional(),
    answerLatex: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    const hasOption = Boolean(value.selectedOption && value.selectedOption.length > 0);
    const hasContent =
      Boolean(value.answerText && value.answerText.length > 0) ||
      Boolean(value.answerLatex && value.answerLatex.length > 0);

    if (!hasOption && !hasContent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one of selectedOption, answerText, or answerLatex is required.",
      });
    }
  });

export type StudentAnswer = z.infer<typeof studentAnswerSchema>;

export const paperEvaluationRequestSchema = z.object({
  paperId: z.string().min(1),
  questions: z.array(questionSchema).min(1),
  modelAnswers: z.array(modelAnswerSchema).min(1),
  studentAnswers: z.array(studentAnswerSchema).min(1),
});

export type PaperEvaluationRequest = z.infer<typeof paperEvaluationRequestSchema>;

export const rubricCriterionSchema = z.object({
  criterionId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  maxMarks: z.number().nonnegative(),
});

export type RubricCriterion = z.infer<typeof rubricCriterionSchema>;

export const questionRubricSchema = z.object({
  questionNo: z.string().min(1),
  section: sectionSchema,
  criteria: z.array(rubricCriterionSchema).min(1),
});

export type QuestionRubric = z.infer<typeof questionRubricSchema>;

export const rubricScoreSchema = z.object({
  criterionId: z.string().min(1),
  marksAwarded: z.number().nonnegative(),
  maxMarks: z.number().nonnegative(),
  reason: z.string().min(1),
});

export type RubricScore = z.infer<typeof rubricScoreSchema>;

export const questionBundleSchema = z.object({
  key: z.string().min(1),
  question: questionSchema,
  modelAnswer: modelAnswerSchema,
  studentAnswer: studentAnswerSchema,
});

export type QuestionBundle = z.infer<typeof questionBundleSchema>;

export const normalizedPayloadSchema = z.object({
  paperId: z.string().min(1),
  questions: z.array(questionSchema),
  modelAnswers: z.array(modelAnswerSchema),
  studentAnswers: z.array(studentAnswerSchema),
});

export type NormalizedPayload = z.infer<typeof normalizedPayloadSchema>;

export const mcqQuestionResultSchema = z.object({
  questionNo: z.string().min(1),
  section: sectionSchema,
  type: z.literal("mcq"),
  marksAwarded: z.number().nonnegative(),
  maxMarks: z.number().positive(),
  isCorrect: z.boolean(),
  selectedOption: z.string().optional(),
  correctOption: z.string().min(1),
});

export type McqQuestionResult = z.infer<typeof mcqQuestionResultSchema>;

export const nonMcqQuestionResultSchema = z.object({
  questionNo: z.string().min(1),
  section: sectionSchema,
  type: z.enum(["short", "long"]),
  marksAwarded: z.number().nonnegative(),
  maxMarks: z.number().positive(),
  rubricBreakdown: z.array(rubricScoreSchema),
  explanation: z.string().min(1),
  improvements: z.array(z.string().min(1)).default([]),
});

export type NonMcqQuestionResult = z.infer<typeof nonMcqQuestionResultSchema>;

export const questionResultSchema = z.discriminatedUnion("type", [mcqQuestionResultSchema, nonMcqQuestionResultSchema]);

export type QuestionResult = z.infer<typeof questionResultSchema>;

export const sectionTotalSchema = z.object({
  section: sectionSchema,
  marksAwarded: z.number().nonnegative(),
  maxMarks: z.number().nonnegative(),
});

export type SectionTotal = z.infer<typeof sectionTotalSchema>;

export const paperEvaluationResponseSchema = z.object({
  paperId: z.string().min(1),
  questionResults: z.array(questionResultSchema),
  sectionTotals: z.array(sectionTotalSchema),
  finalTotal: z.object({
    marksAwarded: z.number().nonnegative(),
    maxMarks: z.number().nonnegative(),
  }),
});

export type PaperEvaluationResponse = z.infer<typeof paperEvaluationResponseSchema>;

export const generateRubricOutputSchema = z.object({
  criteria: z.array(rubricCriterionSchema).min(1),
});

export const evaluateNonMcqOutputSchema = z.object({
  rubricBreakdown: z.array(rubricScoreSchema).min(1),
  explanation: z.string().min(1),
  improvements: z.array(z.string().min(1)).default([]),
});
