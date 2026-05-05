import { type Request, type Response, Router } from "express";
import { asyncHandler } from "@/core/middleware/async.handler";
import { validate } from "@/core/middleware/validation.middleware";
import { ApiResponse } from "@/core/utils/api.response";
import { learningAnalyzer } from "./index";
import { GetErrorPatternsSchema, GetLearningMetricsSchema, SubmitCorrectionSchema } from "./schema";

const router = Router();

router.post(
	"/corrections",
	validate(SubmitCorrectionSchema),
	asyncHandler(async (req: Request, res: Response) => {
		const correction = await learningAnalyzer.submitCorrection(req.body);
		return res.status(201).json(ApiResponse.success("Correction submitted successfully", correction));
	}),
);

router.get(
	"/patterns",
	asyncHandler(async (req: Request, res: Response) => {
		const queryResult = GetErrorPatternsSchema.safeParse(req.query);
		if (!queryResult.success) {
			return res.status(400).json(ApiResponse.error("Validation failed", queryResult.error.issues));
		}

		const patterns = await learningAnalyzer.analyzeErrorPatterns(queryResult.data.limit ?? 50);
		return res.json(ApiResponse.success("Error patterns retrieved", patterns));
	}),
);

router.get(
	"/metrics",
	asyncHandler(async (req: Request, res: Response) => {
		const queryResult = GetLearningMetricsSchema.safeParse(req.query);
		if (!queryResult.success) {
			return res.status(400).json(ApiResponse.error("Validation failed", queryResult.error.issues));
		}

		const metrics = await learningAnalyzer.getLearningMetrics(
			queryResult.data.metricType,
			queryResult.data.startDate,
			queryResult.data.endDate,
			queryResult.data.limit ?? 50,
		);
		return res.json(ApiResponse.success("Learning metrics retrieved", metrics));
	}),
);

router.get(
	"/correction-rate",
	asyncHandler(async (req: Request, res: Response) => {
		const modelUsed = req.query.model as string | undefined;
		const rate = await learningAnalyzer.getCorrectionRate(modelUsed);
		return res.json(ApiResponse.success("Correction rate retrieved", rate));
	}),
);

router.get(
	"/model-comparison",
	asyncHandler(async (_req: Request, res: Response) => {
		const comparison = await learningAnalyzer.getModelPerformanceComparison();
		return res.json(ApiResponse.success("Model comparison retrieved", comparison));
	}),
);

router.patch(
	"/patterns/:id/resolve",
	asyncHandler(async (req: Request, res: Response) => {
		const patternId = typeof req.params.id === "string" ? req.params.id : "";
		const suggestedFix = typeof req.body?.suggestedFix === "string" ? req.body.suggestedFix : "";

		if (!patternId || !suggestedFix) {
			return res.status(400).json(ApiResponse.error("Validation failed", "id and suggestedFix are required"));
		}

		const resolved = await learningAnalyzer.resolveErrorPattern(patternId, suggestedFix);
		return res.json(ApiResponse.success("Pattern resolved", resolved));
	}),
);

export default router;
