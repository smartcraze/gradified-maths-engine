import { type Request, type Response, Router } from "express";
import multer from "multer";
import { z } from "zod";
import { asyncHandler } from "@/core/middleware/async.handler";
import { ApiResponse } from "@/core/utils/api.response";
import { generateRequestId, generateSlug } from "@/core/utils/slug.util";
import { db } from "@/db";
import { ocrRequests } from "@/db/schema";
import { processOLMOCR } from "./index";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const OLMOCRRequestSchema = z.object({
	pdfPath: z.string().min(1).optional(),
});

/**
 * POST /olm-ocr
 * Upload and process a PDF using OLMO OCR Engine
 * @param file - PDF file (multipart/form-data)
 * @param pdfPath - (optional) Path identifier for the PDF. Defaults to filename if not provided
 */
router.post(
	"/",
	upload.single("file"),
	asyncHandler(async (req: Request, res: Response) => {
		if (!req.file) {
			res.status(400).json(ApiResponse.error("PDF file is required", null));
			return;
		}

		const parsedBody = OLMOCRRequestSchema.safeParse(req.body);
		if (!parsedBody.success) {
			res.status(400).json(ApiResponse.error("Validation failed", parsedBody.error.issues));
			return;
		}

		// Use provided pdfPath or default to filename
		const pdfPath = parsedBody.data.pdfPath || req.file.originalname;

		const result = await processOLMOCR({
			pdfBytes: req.file.buffer,
			pdfPath,
		});

		const statusCode = result.success ? 200 : 500;

		if (result.success) {
			const slug = generateSlug("ocr");
			const requestId = generateRequestId();

			const [row] = await db
				.insert(ocrRequests)
				.values({
					file_name: req.file.originalname,
					mime_type: req.file.mimetype,
					size_bytes: req.file.size,
					request_id: requestId,
					slug,
					status: "complete",
					parsed: true,
					raw_response: result.results as Record<string, unknown>,
				})
				.returning({ id: ocrRequests.id });

			return res.status(statusCode).json(
				ApiResponse.success(result.message, {
					slug,
					request_id: requestId,
					id: row?.id ?? null,
					rawmarkdown: result.results?.raw_markdown ?? null,
					equations: result.results?.equations ?? [],
				}),
			);
		}

		return res.status(statusCode).json(ApiResponse.error(result.message, result.error));
	}),
);

export default router;
