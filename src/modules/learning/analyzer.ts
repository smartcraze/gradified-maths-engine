import { InMemoryLearningRepository, type LearningRepository, type StepCorrection } from "./repository";
import type { SubmitCorrectionInput } from "./schema";

export class LearningAnalyzer {
	constructor(private readonly repository: LearningRepository) {}

	async submitCorrection(input: SubmitCorrectionInput) {
		const evaluation = await this.repository.findEvaluationById(input.evaluationId);

		if (!evaluation) {
			throw new Error("Evaluation not found");
		}

		const originalQuestion = (
			evaluation.questionWiseMarks as unknown as Array<{
				question_id: string;
				marks_awarded: number;
				correctness: string;
			}>
		)?.find((q) => q.question_id === input.questionId);

		if (!originalQuestion) {
			throw new Error("Question not found in evaluation");
		}

		const originalCorrectness = originalQuestion.correctness;
		const aiAgreement =
			input.correctedCorrectness === originalCorrectness && input.correctedMarks === originalQuestion.marks_awarded;

		const correction = await this.repository.createEvaluationCorrection({
			evaluationId: input.evaluationId,
			questionId: input.questionId,
			originalMarks: originalQuestion.marks_awarded,
			correctedMarks: input.correctedMarks,
			originalCorrectness,
			correctedCorrectness: input.correctedCorrectness,
			correctionReason: input.correctionReason,
			teacherId: input.teacherId,
			teacherName: input.teacherName,
			aiAgreement,
			stepCorrections: input.stepCorrections,
			status: "PENDING",
		});

		await this.updateLearningMetrics(correction, evaluation.modelUsed);

		return correction;
	}

	private async updateLearningMetrics(
		correction: { originalMarks: number; correctedMarks: number },
		modelUsed?: string | null,
	) {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const correctionDelta = Number(correction.correctedMarks) - Number(correction.originalMarks);

		await this.repository.incrementLearningMetric({
			metricType: "correction_delta",
			date: today,
			delta: correctionDelta,
			metadata: { model: modelUsed },
		});

		await this.repository.incrementLearningMetric({
			metricType: "total_corrections",
			date: today,
			delta: 1,
		});
	}

	async analyzeErrorPatterns(limit = 50) {
		const corrections = await this.repository.findApprovedCorrections(limit);

		const patterns = new Map<string, { count: number; severity: string; description: string }>();

		for (const correction of corrections) {
			const diff = Number(correction.correctedMarks) - Number(correction.originalMarks);

			if (diff > 0 && correction.aiAgreement === false) {
				const key = "under_awarded";
				const existing = patterns.get(key) || {
					count: 0,
					severity: "high",
					description: "AI under-awarded marks",
				};
				existing.count++;
				patterns.set(key, existing);
			}

			if (diff < 0 && correction.aiAgreement === false) {
				const key = "over_awarded";
				const existing = patterns.get(key) || {
					count: 0,
					severity: "high",
					description: "AI over-awarded marks",
				};
				existing.count++;
				patterns.set(key, existing);
			}

			if (correction.stepCorrections) {
				const stepCorrections = correction.stepCorrections as StepCorrection[];
				for (const step of stepCorrections) {
					if (step.originalIsCorrect !== step.correctedIsCorrect) {
						const key = "step_misclassification";
						const existing = patterns.get(key) || {
							count: 0,
							severity: "medium",
							description: "Step correctness misclassified",
						};
						existing.count++;
						patterns.set(key, existing);
					}
				}
			}

			if (correction.correctedCorrectness !== correction.originalCorrectness) {
				const key = "correctness_misclassification";
				const existing = patterns.get(key) || {
					count: 0,
					severity: "medium",
					description: "Overall correctness misclassified",
				};
				existing.count++;
				patterns.set(key, existing);
			}
		}

		const results: Array<{ patternType: string; count: number; severity: string; description: string }> = [];

		for (const [patternType, data] of patterns) {
			results.push({
				patternType,
				count: data.count,
				severity: data.severity,
				description: data.description,
			});

			await this.repository.upsertErrorPattern({
				patternType,
				category: patternType.split("_")[0],
				frequencyIncrement: data.count,
				severity: data.severity,
				description: data.description,
			});
		}

		return results;
	}

	async getLearningMetrics(metricType?: string, startDate?: string, endDate?: string, limit = 50) {
		return this.repository.findLearningMetrics({
			metricType,
			startDate: startDate ? new Date(startDate) : undefined,
			endDate: endDate ? new Date(endDate) : undefined,
			limit,
		});
	}

	async getErrorPatterns(unresolvedOnly = true, limit = 50) {
		return this.repository.findErrorPatterns({ unresolvedOnly, limit });
	}

	async resolveErrorPattern(patternId: string, suggestedFix: string) {
		return this.repository.resolveErrorPattern(patternId, suggestedFix);
	}

	async getCorrectionRate(modelUsed?: string) {
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const totalCorrections = await this.repository.countCorrectionsSince(thirtyDaysAgo, modelUsed);
		const totalEvaluations = await this.repository.countEvaluationsSince(thirtyDaysAgo, modelUsed);

		return {
			totalCorrections,
			totalEvaluations,
			correctionRate: totalEvaluations > 0 ? (totalCorrections / totalEvaluations) * 100 : 0,
		};
	}

	async getModelPerformanceComparison() {
		const models = await this.repository.listDistinctModels();

		const results = [];

		for (const model of models) {
			const correctionData = await this.getCorrectionRate(model);
			results.push({
				model,
				...correctionData,
			});
		}

		return results;
	}
}

export const learningAnalyzer = new LearningAnalyzer(new InMemoryLearningRepository());
