import { type Request, type Response, Router } from "express";
import { z } from "zod";
import { ApiResponse } from "@/core/utils/api.response";
import { gradeStudentAnswerSheet } from "@/modules/grading";
import type { Evaluation } from "@/modules/grading/schema";

const router = Router();

const EvaluateRequestSchema = z.object({
	questionPaper: z.string().min(1),
	modelAnswers: z.string().min(1),
	studentAnswerSheet: z.string().min(1),
});

type EvaluateRequest = z.infer<typeof EvaluateRequestSchema>;

/**
 * POST /api/evaluate
 * Evaluate a student answer sheet without DB persistence.
 */
router.post("/", async (req: Request, res: Response) => {
	try {
		const payload: EvaluateRequest = EvaluateRequestSchema.parse(req.body);

		const evaluation: Evaluation = await gradeStudentAnswerSheet({
			questionPaper: payload.questionPaper,
			modelAnswers: payload.modelAnswers,
			studentAnswerSheet: payload.studentAnswerSheet,
		});

		return res.status(200).json(ApiResponse.success("Evaluation completed", evaluation));
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json(ApiResponse.error("Validation error", error.issues));
		}

		console.error("Evaluation error:", error);
		return res.status(500).json(ApiResponse.error("Internal server error"));
	}
});

export default router;
