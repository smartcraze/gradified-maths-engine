import { generateText, Output } from "ai";
import { getOpenRouterModelForRole, getOpenRouterModelName } from "@/config/open-router";
import logger from "@/core/utils/logger";
import { type QuestionRoutingResult, questionRoutingSchema, type RoutingInput } from "@/types/index";

const QUESTION_ROUTER_SYSTEM_PROMPT = [
  "You are a math question type classifier.",
  "Classify each prompt into exactly one type: algebra, calculus, proof, or mcq.",
  "Use only the provided question and answer context.",
  "If mixed algebra+calculus, classify as algebra.",
  "Return strict structured output matching the schema.",
].join(" ");

const FALLBACK_ROUTING_RESULT: QuestionRoutingResult = {
  questionType: "algebra",
  confidence: "low",
  rationale: "Fallback classification applied due to routing failure.",
};

export const classifyQuestionType = async (
  input: RoutingInput,
): Promise<{
  result: QuestionRoutingResult;
  usedFallback: boolean;
  routerModel: string;
}> => {
  if (input.questionType) {
    return {
      result: {
        questionType: input.questionType,
        confidence: "high",
        rationale: "Question type provided by caller.",
      },
      usedFallback: false,
      routerModel: getOpenRouterModelName("questionRouter"),
    };
  }

  const routerModel = getOpenRouterModelName("questionRouter");

  try {
    const { output } = await generateText({
      model: getOpenRouterModelForRole("questionRouter"),
      output: Output.object({
        schema: questionRoutingSchema,
      }),
      system: QUESTION_ROUTER_SYSTEM_PROMPT,
      prompt: [
        `paperId: ${input.paperId}`,
        `questionId: ${input.questionId}`,
        `maxMarks: ${input.maxMarks}`,
        `questionLatex: ${input.questionLatex}`,
        `studentAnswerLatex: ${input.studentAnswerLatex}`,
      ].join("\n"),
    });

    return {
      result: output,
      usedFallback: false,
      routerModel,
    };
  } catch (error) {
    logger.warn(
      {
        err: error,
        paperId: input.paperId,
        questionId: input.questionId,
        routerModel,
      },
      "question_type_routing_failed_using_fallback",
    );

    return {
      result: FALLBACK_ROUTING_RESULT,
      usedFallback: true,
      routerModel,
    };
  }
};
