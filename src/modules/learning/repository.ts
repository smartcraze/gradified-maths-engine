type QuestionWiseMark = {
	question_id: string;
	marks_awarded: number;
	correctness: string;
};

export type LearningEvaluation = {
	id: string;
	modelUsed?: string | null;
	questionWiseMarks: QuestionWiseMark[];
	createdAt: Date;
};

export type StepCorrection = {
	stepIndex: number;
	originalIsCorrect: boolean;
	correctedIsCorrect: boolean;
	reason?: string;
};

export type EvaluationCorrectionRecord = {
	id: string;
	evaluationId: string;
	questionId: string;
	originalMarks: number;
	correctedMarks: number;
	originalCorrectness: string;
	correctedCorrectness: string;
	correctionReason?: string;
	teacherId?: string;
	teacherName?: string;
	aiAgreement: boolean;
	stepCorrections?: StepCorrection[];
	status: "PENDING" | "APPROVED" | "REJECTED";
	createdAt: Date;
};

export type LearningMetricRecord = {
	id: string;
	metricType: string;
	date: Date;
	value: number;
	metadata?: Record<string, unknown>;
};

export type ErrorPatternRecord = {
	id: string;
	patternType: string;
	category?: string;
	frequency: number;
	severity: string;
	description: string;
	firstSeenAt: Date;
	lastSeenAt: Date;
	resolvedAt: Date | null;
	suggestedFix?: string;
};

export type CreateEvaluationCorrectionInput = Omit<EvaluationCorrectionRecord, "id" | "createdAt">;

export interface LearningRepository {
	findEvaluationById(evaluationId: string): Promise<LearningEvaluation | null>;
	createEvaluationCorrection(input: CreateEvaluationCorrectionInput): Promise<EvaluationCorrectionRecord>;
	incrementLearningMetric(input: {
		metricType: string;
		date: Date;
		delta: number;
		metadata?: Record<string, unknown>;
	}): Promise<void>;
	findApprovedCorrections(limit: number): Promise<EvaluationCorrectionRecord[]>;
	upsertErrorPattern(input: {
		patternType: string;
		category?: string;
		frequencyIncrement: number;
		severity: string;
		description: string;
	}): Promise<void>;
	findLearningMetrics(input: {
		metricType?: string;
		startDate?: Date;
		endDate?: Date;
		limit: number;
	}): Promise<LearningMetricRecord[]>;
	findErrorPatterns(input: { unresolvedOnly: boolean; limit: number }): Promise<ErrorPatternRecord[]>;
	resolveErrorPattern(patternId: string, suggestedFix: string): Promise<ErrorPatternRecord>;
	countCorrectionsSince(since: Date, modelUsed?: string): Promise<number>;
	countEvaluationsSince(since: Date, modelUsed?: string): Promise<number>;
	listDistinctModels(): Promise<string[]>;
}

type InMemoryLearningRepositorySeed = {
	evaluations?: LearningEvaluation[];
	corrections?: EvaluationCorrectionRecord[];
	metrics?: LearningMetricRecord[];
	errorPatterns?: ErrorPatternRecord[];
};

function randomId(prefix: string): string {
	return `${prefix}_${crypto.randomUUID()}`;
}

function startOfDay(date: Date): Date {
	const day = new Date(date);
	day.setHours(0, 0, 0, 0);
	return day;
}

function isSameDay(a: Date, b: Date): boolean {
	return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export class InMemoryLearningRepository implements LearningRepository {
	private readonly evaluations = new Map<string, LearningEvaluation>();
	private readonly corrections: EvaluationCorrectionRecord[] = [];
	private readonly metrics: LearningMetricRecord[] = [];
	private readonly errorPatterns: ErrorPatternRecord[] = [];

	constructor(seed?: InMemoryLearningRepositorySeed) {
		for (const evaluation of seed?.evaluations ?? []) {
			this.evaluations.set(evaluation.id, evaluation);
		}

		this.corrections.push(...(seed?.corrections ?? []));
		this.metrics.push(...(seed?.metrics ?? []));
		this.errorPatterns.push(...(seed?.errorPatterns ?? []));
	}

	async findEvaluationById(evaluationId: string): Promise<LearningEvaluation | null> {
		return this.evaluations.get(evaluationId) ?? null;
	}

	async createEvaluationCorrection(input: CreateEvaluationCorrectionInput): Promise<EvaluationCorrectionRecord> {
		const record: EvaluationCorrectionRecord = {
			id: randomId("correction"),
			createdAt: new Date(),
			...input,
		};

		this.corrections.push(record);
		return record;
	}

	async incrementLearningMetric(input: {
		metricType: string;
		date: Date;
		delta: number;
		metadata?: Record<string, unknown>;
	}): Promise<void> {
		const existing = this.metrics.find(
			(metric) => metric.metricType === input.metricType && isSameDay(metric.date, input.date),
		);

		if (existing) {
			existing.value += input.delta;
			return;
		}

		this.metrics.push({
			id: randomId("metric"),
			metricType: input.metricType,
			date: startOfDay(input.date),
			value: input.delta,
			metadata: input.metadata,
		});
	}

	async findApprovedCorrections(limit: number): Promise<EvaluationCorrectionRecord[]> {
		return this.corrections
			.filter((correction) => correction.status === "APPROVED")
			.slice(-limit)
			.reverse();
	}

	async upsertErrorPattern(input: {
		patternType: string;
		category?: string;
		frequencyIncrement: number;
		severity: string;
		description: string;
	}): Promise<void> {
		const existing = this.errorPatterns.find((pattern) => pattern.patternType === input.patternType);

		if (existing) {
			existing.frequency += input.frequencyIncrement;
			existing.lastSeenAt = new Date();
			return;
		}

		const now = new Date();
		this.errorPatterns.push({
			id: randomId("pattern"),
			patternType: input.patternType,
			category: input.category,
			frequency: input.frequencyIncrement,
			severity: input.severity,
			description: input.description,
			firstSeenAt: now,
			lastSeenAt: now,
			resolvedAt: null,
		});
	}

	async findLearningMetrics(input: {
		metricType?: string;
		startDate?: Date;
		endDate?: Date;
		limit: number;
	}): Promise<LearningMetricRecord[]> {
		return this.metrics
			.filter((metric) => {
				if (input.metricType && metric.metricType !== input.metricType) return false;
				if (input.startDate && metric.date < input.startDate) return false;
				if (input.endDate && metric.date > input.endDate) return false;
				return true;
			})
			.sort((a, b) => b.date.getTime() - a.date.getTime())
			.slice(0, input.limit);
	}

	async findErrorPatterns(input: { unresolvedOnly: boolean; limit: number }): Promise<ErrorPatternRecord[]> {
		return this.errorPatterns
			.filter((pattern) => (input.unresolvedOnly ? pattern.resolvedAt === null : true))
			.sort((a, b) => b.frequency - a.frequency)
			.slice(0, input.limit);
	}

	async resolveErrorPattern(patternId: string, suggestedFix: string): Promise<ErrorPatternRecord> {
		const pattern = this.errorPatterns.find((item) => item.id === patternId);
		if (!pattern) {
			throw new Error("Pattern not found");
		}

		pattern.resolvedAt = new Date();
		pattern.suggestedFix = suggestedFix;
		return pattern;
	}

	async countCorrectionsSince(since: Date, modelUsed?: string): Promise<number> {
		if (!modelUsed) {
			return this.corrections.filter((correction) => correction.createdAt >= since).length;
		}

		return this.corrections.filter((correction) => {
			if (correction.createdAt < since) return false;
			const evaluation = this.evaluations.get(correction.evaluationId);
			return evaluation?.modelUsed === modelUsed;
		}).length;
	}

	async countEvaluationsSince(since: Date, modelUsed?: string): Promise<number> {
		const evaluations = [...this.evaluations.values()];

		if (!modelUsed) {
			return evaluations.filter((evaluation) => evaluation.createdAt >= since).length;
		}

		return evaluations.filter((evaluation) => evaluation.createdAt >= since && evaluation.modelUsed === modelUsed)
			.length;
	}

	async listDistinctModels(): Promise<string[]> {
		return [
			...new Set([...this.evaluations.values()].map((evaluation) => evaluation.modelUsed).filter(Boolean)),
		] as string[];
	}
}
