import type { Evaluation } from "./schema";

export type GradingRepository = {
	saveEvaluationForOcrRequest(input: { ocrRequestId: number; evaluation: Evaluation }): Promise<Evaluation>;
};

const evaluationStore = new Map<number, Evaluation>();

export function createGradingRepository(): GradingRepository {
	return {
		async saveEvaluationForOcrRequest({ ocrRequestId, evaluation }) {
			evaluationStore.set(ocrRequestId, evaluation);
			return evaluation;
		},
	};
}

export const gradingRepository = createGradingRepository();
