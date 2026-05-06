import { type Request, type Response, Router } from "express";
import multer from "multer";
import { z } from "zod";
import { asyncHandler } from "@/core/middleware/async.handler";
import { ApiResponse } from "@/core/utils/api.response";
import { getOCRResult, processOCR } from "./index";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const OcrParamsSchema = z.object({
	ocrRequestId: z.coerce.number().int().positive(),
});

router.post(
	"/",
	upload.single("file"),
	asyncHandler(async (req: Request, res: Response) => {
		if (!req.file) {
			return res.status(400).json(ApiResponse.error("File upload is required", null));
		}

		const submission = await processOCR({
			fileName: req.file.originalname,
			mimeType: req.file.mimetype,
			sizeBytes: req.file.size,
			buffer: req.file.buffer,
		});

		return res.status(201).json(ApiResponse.success("OCR request created successfully", submission));
	}),
);

router.get(
	"/:ocrRequestId",
	asyncHandler(async (req: Request, res: Response) => {
		const parsedParams = OcrParamsSchema.safeParse(req.params);

		if (!parsedParams.success) {
			return res.status(400).json(ApiResponse.error("Validation failed", parsedParams.error.issues));
		}
		const { ocrRequestId } = parsedParams.data;
		const result = await getOCRResult(ocrRequestId);

		if (!result) {
			return res.status(404).json(ApiResponse.error("OCR request not found", null));
		}

		return res.json(ApiResponse.success("OCR request retrieved successfully", result));
	}),
);

export default router;
