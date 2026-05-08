import { type Request, type Response, Router } from "express";
import { z } from "zod";
import logger from "@/core/middleware/logger.middleware";
import { ApiResponse } from "@/core/utils/api.response";
import { generateSlug, validateOcrResponse } from "@/core/utils/slug.util";
import { db } from "@/db";
import { ocrRequests } from "@/db/schema";

const router = Router();

// Schema for OCR upload
const OcrUploadSchema = z.object({
	fileName: z.string().min(1),
	mimeType: z.string().min(1),
	sizeBytes: z.number().int().min(0).optional().default(0),
	rawResponse: z.unknown(), // Frontend-provided OCR JSON
});

/**
 * POST /api/ocr
 * Frontend calls olm-ocr and sends the result here
 * Returns: slug (for referencing), request_id, OCR metadata
 */
router.post("/", async (req: Request, res: Response) => {
	try {
		const payload = OcrUploadSchema.parse(req.body);

		// Validate OCR response structure
		if (!validateOcrResponse(payload.rawResponse)) {
			return res.status(400).json(ApiResponse.error("Invalid OCR response structure"));
		}

		// Generate slug and request ID
		const slug = generateSlug("ocr");
		const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

		// Store OCR result in DB
		const result = await db
			.insert(ocrRequests)
			.values({
				file_name: payload.fileName,
				mime_type: payload.mimeType,
				size_bytes: payload.sizeBytes,
				request_id: requestId,
				slug,
				status: "complete", // Frontend already has OCR result
				parsed: true,
				raw_response: payload.rawResponse as Record<string, unknown>,
			})
			.returning({ id: ocrRequests.id, slug: ocrRequests.slug, request_id: ocrRequests.request_id });

		logger.info(`OCR stored: slug=${slug}, request_id=${requestId}`);

		return res.status(201).json(
			ApiResponse.success("OCR stored successfully", {
				slug,
				request_id: requestId,
				id: result[0]?.id,
			}),
		);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json(ApiResponse.error("Validation error", error.errors));
		}
		logger.error("OCR upload error:", error);
		return res.status(500).json(ApiResponse.error("Internal server error"));
	}
});

export default router;
