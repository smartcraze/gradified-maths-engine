import { classifyQuestionType } from "@/modules/engine/router";
import { type EngineRoutingResult, type RoutingInput, routingInputSchema } from "@/types";

export const identifyQuestionType = async (payload: RoutingInput): Promise<EngineRoutingResult> => {
  const input = routingInputSchema.parse(payload);

  const { result, usedFallback, routerModel } = await classifyQuestionType(input);

  return {
    paperId: input.paperId,
    questionId: input.questionId,
    questionType: result.questionType,
    confidence: result.confidence,
    rationale: result.rationale,
    usedFallback,
    routerModel,
    nextStage: "rubric-loading",
  };
};

export const engine = {
  identifyQuestionType,
};
