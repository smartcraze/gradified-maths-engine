import { z } from "zod";

export const SubmitCorrectionSchema = z.object({
	evaluationId: z.string().min(1),
	questionId: z.string().min(1),
	correctedMarks: z.number().min(0),
	correctedCorrectness: z.enum(["correct", "partially_correct", "incorrect"]),
	correctionReason: z.string().optional(),
	teacherId: z.string().optional(),
	teacherName: z.string().optional(),
	stepCorrections: z
		.array(
			z.object({
				stepIndex: z.number(),
				originalIsCorrect: z.boolean(),
				correctedIsCorrect: z.boolean(),
				reason: z.string().optional(),
			}),
		)
		.optional(),
});

export const PromptVersionSchema = z.object({
	version: z.string(),
	promptText: z.string(),
	description: z.string().optional(),
});

export const UpdatePromptVersionSchema = z.object({
	version: z.string(),
	isActive: z.boolean().optional(),
});

export const GetLearningMetricsSchema = z.object({
	metricType: z.string().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).default(50),
});

export const GetErrorPatternsSchema = z.object({
	patternType: z.string().optional(),
	category: z.string().optional(),
	unresolvedOnly: z.coerce.boolean().default(true),
	limit: z.coerce.number().min(1).max(100).default(50),
});

export type SubmitCorrectionInput = z.infer<typeof SubmitCorrectionSchema>;
export type PromptVersionInput = z.infer<typeof PromptVersionSchema>;
export type LearningMetricsInput = z.infer<typeof GetLearningMetricsSchema>;
export type ErrorPatternsInput = z.infer<typeof GetErrorPatternsSchema>;
