import { generateText, Output, stepCountIs, tool } from "ai";
import { z } from "zod";
import { getDefaultChatModel } from "@/config/ai.provider";
import { ApiError } from "@/core/error/api.error";
import type {
  ModelAnswer,
  NonMcqQuestionResult,
  NormalizedPayload,
  PaperEvaluationRequest,
  QuestionBundle,
  QuestionResult,
  SectionTotal,
  StudentAnswer,
} from "@/types";
import {
  evaluateNonMcqOutputSchema,
  generateRubricOutputSchema,
  mcqQuestionResultSchema,
  nonMcqQuestionResultSchema,
  normalizedPayloadSchema,
  paperEvaluationRequestSchema,
  paperEvaluationResponseSchema,
  questionBundleSchema,
  questionResultSchema,
  questionRubricSchema,
  sectionTotalSchema,
} from "@/types";

const buildKey = (section: string, questionNo: string) => `${section}::${questionNo}`;
const normalizeOption = (value?: string) => (value ? value.trim().toUpperCase() : "");
const round2 = (value: number) => Math.round(value * 100) / 100;
const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

const rubricWithKeySchema = questionRubricSchema.extend({
  key: z.string().min(1),
});

const aggregateResultOutputSchema = paperEvaluationResponseSchema.pick({
  sectionTotals: true,
  finalTotal: true,
});

export const normalizePayloadTool = (input: PaperEvaluationRequest): NormalizedPayload =>
  normalizedPayloadSchema.parse({
    paperId: input.paperId,
    questions: input.questions,
    modelAnswers: input.modelAnswers,
    studentAnswers: input.studentAnswers,
  });

export const matchQuestionBundleTool = (payload: NormalizedPayload): QuestionBundle[] => {
  const modelByKey = new Map<string, ModelAnswer>();
  const studentByKey = new Map<string, StudentAnswer>();

  for (const item of payload.modelAnswers) {
    modelByKey.set(buildKey(item.section, item.questionNo), item);
  }

  for (const item of payload.studentAnswers) {
    studentByKey.set(buildKey(item.section, item.questionNo), item);
  }

  return payload.questions.map((question) => {
    const key = buildKey(question.section, question.questionNo);
    const modelAnswer = modelByKey.get(key);
    const studentAnswer = studentByKey.get(key);

    if (!modelAnswer) {
      throw ApiError.badRequest(`Missing model answer for ${key}`);
    }

    if (!studentAnswer) {
      throw ApiError.badRequest(`Missing student answer for ${key}`);
    }

    if (modelAnswer.type !== question.type) {
      throw ApiError.badRequest(`Question type mismatch for ${key}`);
    }

    return questionBundleSchema.parse({
      key,
      question,
      modelAnswer,
      studentAnswer,
    });
  });
};

export const gradeMcqDeterministicTool = (bundle: QuestionBundle): QuestionResult => {
  if (bundle.question.type !== "mcq") {
    throw ApiError.badRequest("gradeMcqDeterministicTool can only be used for mcq questions.");
  }

  const correctOption = normalizeOption(bundle.modelAnswer.mcqCorrectOption);
  const selectedOption = normalizeOption(bundle.studentAnswer.selectedOption);
  const isCorrect = selectedOption.length > 0 && selectedOption === correctOption;

  return mcqQuestionResultSchema.parse({
    questionNo: bundle.question.questionNo,
    section: bundle.question.section,
    type: "mcq",
    marksAwarded: isCorrect ? bundle.question.maxMarks : 0,
    maxMarks: bundle.question.maxMarks,
    isCorrect,
    selectedOption,
    correctOption,
  });
};

const normalizeRubricTotal = (
  bundle: QuestionBundle,
  criteria: z.infer<typeof generateRubricOutputSchema>["criteria"],
) => {
  const total = round2(sum(criteria.map((item) => item.maxMarks)));
  const target = round2(bundle.question.maxMarks);

  if (total === target) {
    return criteria;
  }

  const ratio = target > 0 ? target / (total || 1) : 0;
  return criteria.map((item, index) => {
    const isLast = index === criteria.length - 1;
    if (isLast) {
      const previousTotal = sum(criteria.slice(0, index).map((criterion) => round2(criterion.maxMarks * ratio)));
      return {
        ...item,
        maxMarks: round2(target - previousTotal),
      };
    }

    return {
      ...item,
      maxMarks: round2(item.maxMarks * ratio),
    };
  });
};

export const generateRubricTool = async (bundle: QuestionBundle) => {
  if (bundle.question.type === "mcq") {
    throw ApiError.badRequest("generateRubricTool is only for non-MCQ questions.");
  }

  const { output } = await generateText({
    model: getDefaultChatModel(),
    output: Output.object({ schema: generateRubricOutputSchema }),
    prompt: [
      "Generate a strict rubric for evaluating one maths answer.",
      `Question type: ${bundle.question.type}`,
      `Section: ${bundle.question.section}`,
      `Question text: ${bundle.question.text ?? ""}`,
      `Question latex: ${bundle.question.latex ?? ""}`,
      `Model answer text: ${bundle.modelAnswer.answerText ?? ""}`,
      `Model answer latex: ${bundle.modelAnswer.answerLatex ?? ""}`,
      `Max marks: ${bundle.question.maxMarks}`,
      "Rules:",
      "- Return 3-6 rubric criteria.",
      "- Sum of criteria maxMarks must equal question maxMarks.",
      "- Keep criteria objective and non-overlapping.",
    ].join("\n"),
  });

  return questionRubricSchema.parse({
    questionNo: bundle.question.questionNo,
    section: bundle.question.section,
    criteria: normalizeRubricTotal(bundle, output.criteria),
  });
};

export const evaluateNonMcqTool = async (
  bundle: QuestionBundle,
  rubric: z.infer<typeof questionRubricSchema>,
): Promise<NonMcqQuestionResult> => {
  if (bundle.question.type === "mcq") {
    throw ApiError.badRequest("evaluateNonMcqTool is only for non-MCQ questions.");
  }

  const { output } = await generateText({
    model: getDefaultChatModel(),
    output: Output.object({ schema: evaluateNonMcqOutputSchema }),
    prompt: [
      "Evaluate the student answer using the rubric.",
      `Question type: ${bundle.question.type}`,
      `Section: ${bundle.question.section}`,
      `Question text: ${bundle.question.text ?? ""}`,
      `Question latex: ${bundle.question.latex ?? ""}`,
      `Model answer text: ${bundle.modelAnswer.answerText ?? ""}`,
      `Model answer latex: ${bundle.modelAnswer.answerLatex ?? ""}`,
      `Student answer text: ${bundle.studentAnswer.answerText ?? ""}`,
      `Student answer latex: ${bundle.studentAnswer.answerLatex ?? ""}`,
      `Rubric JSON: ${JSON.stringify(rubric)}`,
      "Rules:",
      "- Award marks for each rubric criterion.",
      "- marksAwarded for each criterion must be between 0 and maxMarks.",
      "- Explain deductions clearly.",
      "- Add improvements only if there are real gaps.",
    ].join("\n"),
  });

  const clampedBreakdown = output.rubricBreakdown.map((item) => {
    const rubricCriterion = rubric.criteria.find((criterion) => criterion.criterionId === item.criterionId);
    const maxMarks = rubricCriterion?.maxMarks ?? item.maxMarks;

    return {
      ...item,
      maxMarks,
      marksAwarded: Math.min(Math.max(item.marksAwarded, 0), maxMarks),
    };
  });

  const marksAwarded = round2(sum(clampedBreakdown.map((item) => item.marksAwarded)));

  return nonMcqQuestionResultSchema.parse({
    questionNo: bundle.question.questionNo,
    section: bundle.question.section,
    type: bundle.question.type,
    marksAwarded: Math.min(marksAwarded, bundle.question.maxMarks),
    maxMarks: bundle.question.maxMarks,
    rubricBreakdown: clampedBreakdown,
    explanation: output.explanation,
    improvements: output.improvements,
  });
};

export const aggregateResultTool = (
  paperId: string,
  results: QuestionResult[],
): {
  paperId: string;
  questionResults: QuestionResult[];
  sectionTotals: SectionTotal[];
  finalTotal: { marksAwarded: number; maxMarks: number };
} => {
  const aggregate = new Map<string, { marksAwarded: number; maxMarks: number }>();

  for (const result of results) {
    const current = aggregate.get(result.section) ?? { marksAwarded: 0, maxMarks: 0 };
    aggregate.set(result.section, {
      marksAwarded: round2(current.marksAwarded + result.marksAwarded),
      maxMarks: round2(current.maxMarks + result.maxMarks),
    });
  }

  const sectionTotals = Array.from(aggregate.entries()).map(([section, total]) =>
    sectionTotalSchema.parse({
      section,
      marksAwarded: round2(total.marksAwarded),
      maxMarks: round2(total.maxMarks),
    }),
  );

  const finalTotal = {
    marksAwarded: round2(sum(sectionTotals.map((item) => item.marksAwarded))),
    maxMarks: round2(sum(sectionTotals.map((item) => item.maxMarks))),
  };

  return {
    paperId,
    questionResults: results.map((result) => questionResultSchema.parse(result)),
    sectionTotals,
    finalTotal,
  };
};

export const createAiEvaluationTools = () => ({
  normalizePayloadTool: tool({
    description: "Normalize evaluation payload to a consistent structure.",
    inputSchema: z.object({ payload: paperEvaluationRequestSchema }),
    execute: async ({ payload }) => normalizePayloadTool(payload),
  }),
  matchQuestionBundleTool: tool({
    description: "Build one bundle per question by matching question/model/student data.",
    inputSchema: z.object({ payload: normalizedPayloadSchema }),
    execute: async ({ payload }) => matchQuestionBundleTool(payload),
  }),
  gradeMcqDeterministicTool: tool({
    description: "Deterministically grade one MCQ without any advice fields.",
    inputSchema: z.object({ bundle: questionBundleSchema }),
    execute: async ({ bundle }) => gradeMcqDeterministicTool(bundle),
  }),
  generateRubricTool: tool({
    description: "Generate criterion-level rubric for non-MCQ question.",
    inputSchema: z.object({ bundle: questionBundleSchema }),
    execute: async ({ bundle }) => {
      const rubric = await generateRubricTool(bundle);
      return rubricWithKeySchema.parse({ ...rubric, key: bundle.key });
    },
  }),
  evaluateNonMcqTool: tool({
    description: "Score non-MCQ answer against rubric and return explanation + improvements where needed.",
    inputSchema: z.object({
      bundle: questionBundleSchema,
      rubric: questionRubricSchema,
    }),
    execute: async ({ bundle, rubric }) => evaluateNonMcqTool(bundle, rubric),
  }),
  aggregateResultTool: tool({
    description: "Aggregate question-level results into section totals and final total.",
    inputSchema: z.object({
      paperId: z.string().min(1),
      results: z.array(questionResultSchema),
    }),
    execute: async ({ paperId, results }) => {
      const aggregated = aggregateResultTool(paperId, results);
      return aggregateResultOutputSchema.parse({
        sectionTotals: aggregated.sectionTotals,
        finalTotal: aggregated.finalTotal,
      });
    },
  }),
});

export const evaluateQuestionBundle = async (bundle: QuestionBundle): Promise<QuestionResult> => {
  if (bundle.question.type === "mcq") {
    return gradeMcqDeterministicTool(bundle);
  }

  const rubric = await generateRubricTool(bundle);
  return evaluateNonMcqTool(bundle, rubric);
};

export const evaluateWithAiToolLoop = async (bundle: QuestionBundle): Promise<NonMcqQuestionResult> => {
  const tools = createAiEvaluationTools();

  const { output } = await generateText({
    model: getDefaultChatModel(),
    tools,
    stopWhen: stepCountIs(5),
    output: Output.object({ schema: nonMcqQuestionResultSchema }),
    prompt: [
      "For this non-MCQ question, call tools as needed and return final schema output.",
      `Bundle JSON: ${JSON.stringify(bundle)}`,
      "Rules:",
      "- Use generateRubricTool before evaluating.",
      "- Use evaluateNonMcqTool to compute rubricBreakdown and explanation.",
      "- Only add improvements when there is a real gap.",
    ].join("\n"),
  });

  return nonMcqQuestionResultSchema.parse(output);
};
