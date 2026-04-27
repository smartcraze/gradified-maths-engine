import type { NonMcqEvaluationOutput } from "./llm";
import type { QuestionEvaluation } from "./schema";

type RubricCategory = "concept" | "method" | "steps" | "final" | "setup" | "detail";

type RubricSlot = {
	category: RubricCategory;
	marks: number;
};

type StepAnalysis = NonNullable<QuestionEvaluation["steps_analysis"]>[number];

const STEP_TAG_PATTERN = /^\s*\[(concept|method|step|steps|final|setup|detail)\]\s*/i;
const MARK_GRANULARITY = 0.1;

const RUBRIC_POLICY: Record<number, RubricSlot[]> = {
	2: [
		{ category: "concept", marks: 1 },
		{ category: "final", marks: 1 },
	],
	3: [
		{ category: "setup", marks: 1 },
		{ category: "steps", marks: 1 },
		{ category: "final", marks: 1 },
	],
	4: [
		{ category: "concept", marks: 1 },
		{ category: "steps", marks: 1 },
		{ category: "steps", marks: 1 },
		{ category: "final", marks: 1 },
	],
	5: [
		{ category: "setup", marks: 1 },
		{ category: "method", marks: 1 },
		{ category: "method", marks: 1 },
		{ category: "detail", marks: 1 },
		{ category: "final", marks: 1 },
	],
	6: [
		{ category: "concept", marks: 1 },
		{ category: "concept", marks: 1 },
		{ category: "steps", marks: 1 },
		{ category: "steps", marks: 1 },
		{ category: "steps", marks: 1 },
		{ category: "final", marks: 1 },
	],
	8: [
		{ category: "concept", marks: 1 },
		{ category: "concept", marks: 1 },
		{ category: "method", marks: 1 },
		{ category: "method", marks: 1 },
		{ category: "steps", marks: 1 },
		{ category: "steps", marks: 1 },
		{ category: "steps", marks: 1 },
		{ category: "final", marks: 1 },
	],
};

const CATEGORY_ORDER: RubricCategory[] = ["concept", "method", "setup", "steps", "detail", "final"];

/**
 * Restricts a numeric value to a closed range.
 *
 * This keeps calculated marks within the expected lower and upper bounds.
 */
function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/**
 * Rounds a numeric value to the configured scoring precision.
 *
 * The rubric uses this to keep marks stable and avoid floating-point drift.
 */
function roundToGranularity(value: number, granularity: number): number {
	if (granularity <= 0) {
		return value;
	}

	return Math.round(value / granularity) * granularity;
}

/**
 * Extracts the rubric category tag from a step string.
 *
 * Step annotations are expected to begin with a bracketed category label.
 */
function parseCategory(stepText: string): RubricCategory | null {
	const match = stepText.match(STEP_TAG_PATTERN);
	if (!match) {
		return null;
	}

	const raw = match[1]?.toLowerCase();
	if (!raw) {
		return null;
	}
	if (raw === "step") {
		return "steps";
	}

	return raw as RubricCategory;
}

/**
 * Ensures a step is prefixed with a rubric category tag.
 *
 * This keeps downstream scoring and debugging aligned with the policy slots.
 */
function ensureTaggedStep(stepText: string, category: RubricCategory): string {
	if (STEP_TAG_PATTERN.test(stepText)) {
		return stepText.trim();
	}

	return `[${category}] ${stepText}`.trim();
}

/**
 * Spreads a question's total marks across the configured rubric slots.
 *
 * The distribution is normalized to the configured mark granularity.
 */
function distributeMarks(slots: RubricSlot[], total: number): RubricSlot[] {
	const slotCount = slots.length;
	if (slotCount === 0) {
		return [];
	}

	const baseMarks = total / slotCount;
	const roundedMarks = slots.map((slot) => ({
		...slot,
		marks: roundToGranularity(baseMarks, MARK_GRANULARITY),
	}));

	const currentTotal = roundedMarks.reduce((sum, slot) => sum + slot.marks, 0);
	const delta = roundToGranularity(total - currentTotal, MARK_GRANULARITY);
	if (Math.abs(delta) >= MARK_GRANULARITY && roundedMarks.length > 0) {
		const lastIndex = roundedMarks.length - 1;
		const lastSlot = roundedMarks[lastIndex];
		if (lastSlot) {
			roundedMarks[lastIndex] = {
				...lastSlot,
				marks: roundToGranularity(lastSlot.marks + delta, MARK_GRANULARITY),
			};
		}
	}

	return roundedMarks;
}

/**
 * Builds a generic rubric split when no fixed policy exists for a mark total.
 *
 * This preserves deterministic scoring for uncommon question totals.
 */
function buildFallbackSlots(maxMarks: number, stepsCount: number): RubricSlot[] {
	if (maxMarks <= 1) {
		return [{ category: "final", marks: maxMarks }];
	}

	const stepSlots = Math.max(1, stepsCount || Math.round(maxMarks - 1));
	const slots: RubricSlot[] = [
		...Array.from({ length: stepSlots }, () => ({ category: "steps" as const, marks: 1 })),
		{ category: "final", marks: 1 },
	];

	return distributeMarks(slots, maxMarks);
}

/**
 * Aligns model-provided steps with the rubric slots for a question.
 *
 * Missing steps are filled with placeholder evidence so the output stays schema-safe.
 */
function normalizeSteps(steps: StepAnalysis[], slots: RubricSlot[]): StepAnalysis[] {
	const buckets = new Map<RubricCategory, StepAnalysis[]>();
	for (const category of CATEGORY_ORDER) {
		buckets.set(category, []);
	}

	for (const step of steps) {
		const category = parseCategory(step.step) ?? "steps";
		buckets.get(category)?.push(step);
	}

	const takeNext = (category: RubricCategory): StepAnalysis | null => {
		const bucket = buckets.get(category);
		if (bucket && bucket.length > 0) {
			return bucket.shift() ?? null;
		}

		return null;
	};

	const takeAny = (): StepAnalysis | null => {
		for (const category of CATEGORY_ORDER) {
			const next = takeNext(category);
			if (next) {
				return next;
			}
		}

		return null;
	};

	return slots.map((slot) => {
		const candidate = takeNext(slot.category) ?? takeAny();
		const stepText = candidate?.step ?? "No evidence provided.";
		return {
			step: ensureTaggedStep(stepText, slot.category),
			is_correct: Boolean(candidate?.is_correct),
			marks: slot.marks,
		};
	});
}

/**
 * Computes the awarded marks from the normalized step evidence.
 *
 * Only steps marked correct contribute to the total score.
 */
function computeMarks(steps: StepAnalysis[], maxMarks: number): number {
	const total = steps.reduce((sum, step) => sum + (step.is_correct ? step.marks : 0), 0);
	return clamp(roundToGranularity(total, MARK_GRANULARITY), 0, maxMarks);
}

/**
 * Converts the final mark total into a correctness label.
 *
 * This keeps the correctness field aligned with the rubric outcome.
 */
function resolveCorrectness(marksAwarded: number, maxMarks: number): QuestionEvaluation["correctness"] {
	if (marksAwarded >= maxMarks - MARK_GRANULARITY) {
		return "correct";
	}

	if (marksAwarded > 0) {
		return "partially_correct";
	}

	return "incorrect";
}

/**
 * Applies the rubric policy to a single non-MCQ question result.
 *
 * The function normalizes step evidence, recomputes marks, and refreshes correctness.
 */
export function applyRubricPolicyToQuestion(question: QuestionEvaluation): QuestionEvaluation {
	if (question.answer_type === "mcq") {
		return question;
	}

	const baseSteps = question.steps_analysis ?? [];
	const policy = RUBRIC_POLICY[question.max_marks] ?? buildFallbackSlots(question.max_marks, baseSteps.length);
	const normalizedSteps = normalizeSteps(baseSteps, policy);
	const marksAwarded = computeMarks(normalizedSteps, question.max_marks);

	return {
		...question,
		steps_analysis: normalizedSteps,
		marks_awarded: marksAwarded,
		correctness: resolveCorrectness(marksAwarded, question.max_marks),
	};
}

/**
 * Applies the rubric policy to every non-MCQ question in the LLM output.
 *
 * This is the final enforcement layer before the evaluation is merged and returned.
 */
export function applyRubricPolicyToNonMcqEvaluation(output: NonMcqEvaluationOutput): NonMcqEvaluationOutput {
	return {
		...output,
		evaluation: output.evaluation.map((question) => applyRubricPolicyToQuestion(question)),
	};
}
