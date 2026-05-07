export interface OLMOCRPayload {
	raw_markdown?: string;
	equations?: unknown[];
	[key: string]: unknown;
}

export interface OLMOCRInput {
	pdfBytes: Buffer;
	pdfPath: string;
}

export interface OLMOCRResult {
	success: boolean;
	results: OLMOCRPayload | null;
	croppedImages: unknown[];
	message: string;
	error?: string;
}
