import { type Request, type Response, Router } from "express";
import { z } from "zod";
import { asyncHandler } from "@/core/middleware/async.handler";
import { validate } from "@/core/middleware/validation.middleware";
import { ApiResponse } from "@/core/utils/api.response";
import { gradeStoredStudentAnswerSheet, gradeStudentAnswerSheet } from "./index";

const router = Router();

const GradeRequestSchema = z
	.object({
		ocrRequestId: z.number().int().positive().optional(),
		questionPaper: z.string().min(1).optional(),
		modelAnswers: z.string().min(1).optional(),
		studentAnswerSheet: z.string().min(1),
	})
	.superRefine((data, ctx) => {
		if (data.ocrRequestId === undefined && (!data.questionPaper || !data.modelAnswers)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "questionPaper and modelAnswers are required when ocrRequestId is not provided",
				path: ["questionPaper"],
			});
		}
	});

router.post(
	"/evaluate",
	validate(GradeRequestSchema),
	asyncHandler(async (req: Request, res: Response) => {
		const { ocrRequestId, questionPaper, modelAnswers, studentAnswerSheet } = req.body;

		const evaluation =
			ocrRequestId !== undefined
				? await gradeStoredStudentAnswerSheet({
						ocrRequestId,
						studentAnswerSheet,
					})
				: await gradeStudentAnswerSheet({
						questionPaper: questionPaper as string,
						modelAnswers: modelAnswers as string,
						studentAnswerSheet,
					});

		return res.json(ApiResponse.success("Student answer sheet graded successfully", evaluation));
	}),
);

export default router;
