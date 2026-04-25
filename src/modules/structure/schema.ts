import { z } from "zod";

const StructuredQuestionSchema = z.object({
	question_id: z.string(),
	question_text: z.string(),
	options: z
		.array(z.enum(["A", "B", "C", "D"]))
		.optional()
		.describe("Use [] for non-MCQ questions"),
	model_answer: z.string(),
	max_marks: z.number(),
	marks_inferred: z.boolean(),
	sub_questions: z.array(z.object({})),
});

const StructuredSectionSchema = z.object({
	section_name: z.string(),
	type: z.string(),
	questions: z.array(StructuredQuestionSchema),
});

export const StructuredExamSchema = z.object({
	sections: z.array(StructuredSectionSchema),
	metadata: z.object({
		total_questions: z.number(),
		total_marks: z.number(),
	}),
});

export type StructuredQuestion = z.infer<typeof StructuredQuestionSchema>;
export type StructuredSection = z.infer<typeof StructuredSectionSchema>;
export type StructuredExam = z.infer<typeof StructuredExamSchema>;
