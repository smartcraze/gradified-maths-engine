export interface OLMOCRInput {
	pdfBytes: Buffer;
	pdfPath: string;
}

export interface OLMOCRResult {
	success: boolean;
	results: unknown;
	croppedImages: unknown[];
	message: string;
	error?: string;
}
