import { ModalClient } from "modal";
import type { OLMOCRInput, OLMOCRResult } from "./type.ts";

const OCR_APP_NAME = "olmocr-diagram-extractor";
const OCR_CLASS_NAME = "OLMOCREngine";

/**
 * Process a PDF document using OLMO OCR Engine via Modal
 * @param input - PDF file buffer and path
 * @returns OCR results and extracted images
 */
export async function processOLMOCR(input: OLMOCRInput): Promise<OLMOCRResult> {
	const modal = new ModalClient();

	try {
		const cls = await modal.cls.fromName(OCR_APP_NAME, OCR_CLASS_NAME);
		const instance = await cls.instance();
		const ocr = instance.method("process_document");

		const [results, croppedImages] = await ocr.remote([input.pdfBytes, input.pdfPath]);

		return {
			success: true,
			results,
			croppedImages: croppedImages || [],
			message: "OCR processing completed successfully",
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
		console.error("Error calling Modal function:", error);

		return {
			success: false,
			results: null,
			croppedImages: [],
			message: `OCR processing failed: ${errorMessage}`,
			error: errorMessage,
		};
	} finally {
		await modal.close?.();
	}
}
