import { z } from "zod";

export const QuestionFormatSchema = z.enum(["mcq", "numerical", "short", "long"]);

export const MathQuestionTypeSchema = z.enum(["numerical", "algebraic", "proof", "theory", "mixed"]);

export const SectionTypeSchema = z.enum(["mcq", "very_short", "short", "long", "case_study"]);

const MathQuestionBaseSchema = z.object({
	question_id: z.string(),
	question_text: z.string(),
	question_format: QuestionFormatSchema,
	question_type: MathQuestionTypeSchema,
	options: z.array(z.enum(["A", "B", "C", "D"])).describe("Use [] for non-MCQ questions."),
	model_answer: z.string(),
	max_marks: z.number(),
	marks_inferred: z.boolean(),
	final_answer: z
		.string()
		.nullable()
		.describe("Single final result extracted from model answer when present, otherwise null."),
	expected_steps: z
		.array(z.string())
		.describe("Ordered marking checkpoints or solving steps expected in a strong response."),
	key_concepts: z.array(z.string()).describe("Concepts/theorems/formulas expected for evaluation guidance."),
});

export type StructuredQuestion = z.infer<typeof MathQuestionBaseSchema> & {
	sub_questions: StructuredQuestion[];
};

export const StructuredQuestionSchema: z.ZodType<StructuredQuestion> = MathQuestionBaseSchema.extend({
	sub_questions: z.lazy(() => StructuredQuestionSchema.array()),
});

const StructuredSectionSchema = z.object({
	section_name: z.string(),
	type: SectionTypeSchema,
	questions: z.array(StructuredQuestionSchema),
});

export const StructuredExamSchema = z.object({
	sections: z.array(StructuredSectionSchema),
	metadata: z.object({
		total_questions: z.number(),
		total_marks: z.number(),
	}),
});

export type StructuredSection = z.infer<typeof StructuredSectionSchema>;
export type StructuredExam = z.infer<typeof StructuredExamSchema>;
