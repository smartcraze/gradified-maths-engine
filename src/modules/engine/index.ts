import { generateText, Output } from "ai";
import { getDefaultChatModel } from "@/config/ai.provider";
import {
  type StructuredModelAnswer,
  StructuredModelAnswerSchema,
  type StructuredQuestionPaper,
  StructuredQuestionPaperSchema,
  type StructuredStudentSheet,
  StructuredStudentSheetSchema,
} from "@/modules/structure/schema";
import { ENGINE_EVALUATION_SYSTEM_PROMPT } from "./prompt";
import {
  DescriptiveEvaluationBatchSchema,
  type EngineEvaluation,
  type EngineQuestionContext,
  type QuestionEvaluation,
} from "./schema";

type QuestionNode = StructuredQuestionPaper["sections"][number]["questions"][number];

type EvaluationSourceData = {
  questionPaper: StructuredQuestionPaper;
  modelAnswer: StructuredModelAnswer;
  studentSheet: StructuredStudentSheet;
};

function normalizeRef(value?: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[‐‑–—]/g, "-");
}

function normalizeText(value?: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:]/g, "")
    .trim();
}

function normalizeChoiceToken(value?: string | null): string | null {
  const normalized = normalizeText(value).replace(/\s+/g, "");
  const direct = normalized.match(/^(?:option)?([a-d])$/i);
  if (direct?.[1]) {
    return direct[1].toLowerCase();
  }

  const bracketed = normalized.match(/\(?([a-d])\)?$/i);
  if (bracketed?.[1] && normalized.length <= 3) {
    return bracketed[1].toLowerCase();
  }

  return null;
}

function safeEvaluateNumericExpression(value?: string | null): number | null {
  if (!value) {
    return null;
  }

  const sanitized = value.replace(/\s+/g, "").replace(/,/g, "");
  if (!/^[\d.+\-*/()]+$/.test(sanitized)) {
    return null;
  }

  try {
    const result = Function(`"use strict"; return (${sanitized});`)();
    return typeof result === "number" && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

function nearlyEqual(left: number | null, right: number | null): boolean {
  if (left === null || right === null) {
    return false;
  }

  return Math.abs(left - right) < 1e-9;
}

function flattenQuestionPaper(paper: StructuredQuestionPaper): QuestionNode[] {
  const flat: QuestionNode[] = [];

  const walk = (questions: QuestionNode[]) => {
    for (const question of questions) {
      flat.push(question);
      if (question.subQuestions?.length) {
        walk(question.subQuestions);
      }
    }
  };

  for (const section of paper.sections) {
    walk(section.questions);
  }

  return flat;
}

function createModelAnswerMap(modelAnswer: StructuredModelAnswer) {
  return new Map(modelAnswer.answers.map((item) => [normalizeRef(item.questionRef), item]));
}

function createStudentResponseMap(studentSheet: StructuredStudentSheet) {
  return new Map(studentSheet.responses.map((item) => [normalizeRef(item.questionRef), item]));
}

function resolveMcqChoice(question: QuestionNode, value?: string | null): string | null {
  const directChoice = normalizeChoiceToken(value);
  if (directChoice) {
    return directChoice;
  }

  const normalizedValue = normalizeText(value);
  for (const option of question.options ?? []) {
    if (normalizeText(option.text) === normalizedValue) {
      return option.label.toLowerCase();
    }
  }

  return null;
}

function evaluateObjectiveQuestion(
  question: QuestionNode,
  modelAnswer: string,
  finalValue: string | undefined,
  studentResponse: string,
  attempted: boolean,
): QuestionEvaluation {
  const maxMarks = question.marks;

  if (!attempted || !studentResponse.trim()) {
    return {
      questionRef: question.questionNumber ?? String(question.id),
      questionId: question.id,
      questionType: question.type,
      maxMarks,
      awardedMarks: 0,
      verdict: "not_attempted",
      matchedModelAnswer: false,
      rationale: "No meaningful attempt was found for this question.",
      mistakes: ["Question not attempted."],
      improvementSuggestions: ["Attempt the question and show the final answer clearly."],
      rubricBreakdown:
        question.type === "mcq"
          ? undefined
          : [
              {
                criterion: "attempt",
                awardedMarks: 0,
                maxMarks,
                rationale: "No valid answer was provided.",
              },
            ],
    };
  }

  let isMatch = false;
  if (question.type === "mcq") {
    const studentChoice = resolveMcqChoice(question, studentResponse);
    const modelChoice = resolveMcqChoice(question, finalValue ?? modelAnswer);
    isMatch =
      (studentChoice !== null && modelChoice !== null && studentChoice === modelChoice) ||
      normalizeText(studentResponse) === normalizeText(finalValue ?? modelAnswer);
  } else {
    const normalizedStudent = normalizeText(studentResponse);
    const normalizedExpected = normalizeText(finalValue ?? modelAnswer);
    isMatch = normalizedStudent === normalizedExpected;

    if (!isMatch) {
      isMatch = nearlyEqual(
        safeEvaluateNumericExpression(studentResponse),
        safeEvaluateNumericExpression(finalValue ?? modelAnswer),
      );
    }
  }

  return {
    questionRef: question.questionNumber ?? String(question.id),
    questionId: question.id,
    questionType: question.type,
    maxMarks,
    awardedMarks: isMatch ? maxMarks : 0,
    verdict: isMatch ? "correct" : "incorrect",
    matchedModelAnswer: isMatch,
    rationale: isMatch
      ? "The final answer matches the expected objective answer."
      : "The final answer does not match the expected objective answer.",
    mistakes: isMatch ? [] : ["The selected/final answer does not match the expected answer."],
    improvementSuggestions: isMatch
      ? []
      : ["Recheck the final answer and verify it against the required value or option."],
  };
}

function buildQuestionContext(data: EvaluationSourceData) {
  const modelAnswerMap = createModelAnswerMap(data.modelAnswer);
  const studentResponseMap = createStudentResponseMap(data.studentSheet);

  return flattenQuestionPaper(data.questionPaper).map((question) => {
    const ref = normalizeRef(question.questionNumber ?? String(question.id));
    const answer = modelAnswerMap.get(ref);
    const response = studentResponseMap.get(ref);

    return {
      question,
      modelAnswer: answer,
      studentResponse: response,
    };
  });
}

function buildDescriptiveContexts(data: EvaluationSourceData): EngineQuestionContext[] {
  return buildQuestionContext(data)
    .filter(({ question, studentResponse }) => {
      const isObjective = question.type === "mcq" || question.type === "integer";
      return !isObjective && Boolean(studentResponse?.attempted && studentResponse.response.trim());
    })
    .map(({ question, modelAnswer, studentResponse }) => ({
      questionId: question.id,
      questionRef: question.questionNumber ?? String(question.id),
      questionType: question.type,
      answerType: question.answerType,
      section: question.section,
      question: question.question,
      marks: question.marks,
      options: question.options,
      modelAnswer: modelAnswer?.answer,
      keySteps: modelAnswer?.keySteps,
      finalValue: modelAnswer?.finalValue,
      studentResponse: studentResponse?.response ?? "",
    }));
}

function buildLocalResults(data: EvaluationSourceData): QuestionEvaluation[] {
  return buildQuestionContext(data).map(({ question, modelAnswer, studentResponse }) => {
    const attempted = Boolean(studentResponse?.attempted && studentResponse.response.trim());
    const questionRef = question.questionNumber ?? String(question.id);
    const objective = question.type === "mcq" || question.type === "integer";

    if (objective) {
      return evaluateObjectiveQuestion(
        question,
        modelAnswer?.answer ?? "",
        modelAnswer?.finalValue,
        studentResponse?.response ?? "",
        attempted,
      );
    }

    if (!attempted) {
      return {
        questionRef,
        questionId: question.id,
        questionType: question.type,
        maxMarks: question.marks,
        awardedMarks: 0,
        verdict: "not_attempted",
        matchedModelAnswer: false,
        rationale: "No meaningful attempt was found for this descriptive question.",
        mistakes: ["Question not attempted."],
        improvementSuggestions: ["Write at least the setup or first steps so partial credit can be awarded."],
        rubricBreakdown: [
          {
            criterion: "attempt",
            awardedMarks: 0,
            maxMarks: question.marks,
            rationale: "No valid working or final answer was provided.",
          },
        ],
      };
    }

    return {
      questionRef,
      questionId: question.id,
      questionType: question.type,
      maxMarks: question.marks,
      awardedMarks: 0,
      verdict: "incorrect",
      matchedModelAnswer: false,
      rationale: "Awaiting descriptive evaluation.",
      mistakes: [],
      improvementSuggestions: [],
      rubricBreakdown: [],
    };
  });
}

async function evaluateDescriptiveQuestions(questions: EngineQuestionContext[]) {
  if (!questions.length) {
    return {
      questionResults: [] as QuestionEvaluation[],
      summary: {
        overallFeedback: "No attempted descriptive questions were available for rubric grading.",
        strengths: [],
        priorityImprovements: [],
      },
    };
  }

  const { output } = await generateText({
    model: getDefaultChatModel(),
    system: ENGINE_EVALUATION_SYSTEM_PROMPT,
    prompt: JSON.stringify({ questions }, null, 2),
    output: Output.object({
      schema: DescriptiveEvaluationBatchSchema,
    }),
  });

  return output;
}

function mergeResults(localResults: QuestionEvaluation[], descriptiveResults: QuestionEvaluation[]) {
  const descriptiveMap = new Map(descriptiveResults.map((result) => [normalizeRef(result.questionRef), result]));

  return localResults.map((result) => descriptiveMap.get(normalizeRef(result.questionRef)) ?? result);
}

function clampMarks(results: QuestionEvaluation[]) {
  return results.map((result) => {
    const awardedMarks = Math.min(result.maxMarks, Math.max(0, result.awardedMarks));
    const rubricBreakdown = result.rubricBreakdown?.map((criterion) => ({
      ...criterion,
      awardedMarks: Math.min(criterion.maxMarks, Math.max(0, criterion.awardedMarks)),
    }));

    return {
      ...result,
      awardedMarks,
      rubricBreakdown,
    };
  });
}

function buildFallbackSummary(results: QuestionEvaluation[]) {
  const correctCount = results.filter((result) => result.verdict === "correct").length;
  const partialCount = results.filter((result) => result.verdict === "partially_correct").length;
  const improvementRefs = results
    .filter((result) => result.verdict === "incorrect" || result.verdict === "not_attempted")
    .slice(0, 3)
    .map((result) => result.questionRef);

  return {
    overallFeedback: `The submission has ${correctCount} fully correct questions and ${partialCount} partially correct questions.`,
    strengths: correctCount > 0 ? ["Several answers matched the expected result accurately."] : [],
    priorityImprovements:
      improvementRefs.length > 0
        ? [
            `Focus on improving questions ${improvementRefs.join(", ")} by showing method and checking the final answer.`,
          ]
        : [],
  };
}

export function parseEvaluationSource(input: {
  structuredQuestionPaper: unknown;
  structuredModelAnswer: unknown;
  structuredStudentSheet: unknown;
}): EvaluationSourceData {
  return {
    questionPaper: StructuredQuestionPaperSchema.parse(input.structuredQuestionPaper),
    modelAnswer: StructuredModelAnswerSchema.parse(input.structuredModelAnswer),
    studentSheet: StructuredStudentSheetSchema.parse(input.structuredStudentSheet),
  };
}

export async function evaluateStructuredSubmission(input: {
  structuredQuestionPaper: unknown;
  structuredModelAnswer: unknown;
  structuredStudentSheet: unknown;
}): Promise<EngineEvaluation> {
  const parsed = parseEvaluationSource(input);
  const localResults = buildLocalResults(parsed);
  const descriptiveContexts = buildDescriptiveContexts(parsed);
  const descriptiveEvaluation = await evaluateDescriptiveQuestions(descriptiveContexts);
  const merged = clampMarks(mergeResults(localResults, descriptiveEvaluation.questionResults));

  const totalMarks = Number(merged.reduce((sum, result) => sum + result.awardedMarks, 0).toFixed(2));
  const maxMarks = Number(merged.reduce((sum, result) => sum + result.maxMarks, 0).toFixed(2));
  const percentage = maxMarks === 0 ? 0 : Number(((totalMarks / maxMarks) * 100).toFixed(2));
  const summary =
    descriptiveContexts.length > 0 && descriptiveEvaluation.summary.overallFeedback
      ? descriptiveEvaluation.summary
      : buildFallbackSummary(merged);

  return {
    questionResults: merged,
    totalMarks,
    maxMarks,
    percentage,
    summary,
  };
}
