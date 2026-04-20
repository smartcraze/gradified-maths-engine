import {
  aggregateResultTool,
  evaluateQuestionBundle,
  matchQuestionBundleTool,
  normalizePayloadTool,
} from "@/modules/engine/tools";
import type { PaperEvaluationRequest, PaperEvaluationResponse } from "@/types";
import { paperEvaluationResponseSchema } from "@/types";

export const evaluatePaper = async (input: PaperEvaluationRequest): Promise<PaperEvaluationResponse> => {
  const normalized = normalizePayloadTool(input);
  const bundles = matchQuestionBundleTool(normalized);

  const questionResults = [];
  for (const bundle of bundles) {
    const result = await evaluateQuestionBundle(bundle);
    questionResults.push(result);
  }

  const aggregated = aggregateResultTool(normalized.paperId, questionResults);
  return paperEvaluationResponseSchema.parse(aggregated);
};
