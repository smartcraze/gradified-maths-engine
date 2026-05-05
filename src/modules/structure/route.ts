import { type Request, type Response, Router } from "express";
import { z } from "zod";
import { asyncHandler } from "@/core/middleware/async.handler";
import { validate } from "@/core/middleware/validation.middleware";
import { ApiResponse } from "@/core/utils/api.response";
import { getStoredStructuredExamData, getStructuredExamData } from "./index";

const router = Router();

const StructureRequestSchema = z.object({
	questionPaper: z.string().min(1),
	modelAnswers: z.string().min(1),
	ocrRequestId: z.number().int().positive().optional(),
});

const StructureParamsSchema = z.object({
	ocrRequestId: z.coerce.number().int().positive(),
});

router.post(
	"/",
	validate(StructureRequestSchema),
	asyncHandler(async (req: Request, res: Response) => {
		const structuredExam = await getStructuredExamData(req.body.questionPaper, req.body.modelAnswers, {
			ocrRequestId: req.body.ocrRequestId,
		});

		return res.json(ApiResponse.success("Structured exam generated successfully", structuredExam));
	}),
);

router.get(
	"/:ocrRequestId",
	asyncHandler(async (req: Request, res: Response) => {
		const queryResult = StructureParamsSchema.safeParse(req.params);

		if (!queryResult.success) {
			return res.status(400).json(ApiResponse.error("Validation failed", queryResult.error.issues));
		}

		const structuredExam = await getStoredStructuredExamData(queryResult.data.ocrRequestId);

		if (!structuredExam) {
			return res.status(404).json(ApiResponse.error("Structured exam not found", null));
		}

		return res.json(ApiResponse.success("Structured exam retrieved", structuredExam));
	}),
);

export default router;
