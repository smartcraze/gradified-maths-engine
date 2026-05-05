export type OcrStatus = "pending" | "processing" | "complete" | "failed";

export type OcrRequestRecord = {
	id: number;
	fileName: string;
	mimeType: string;
	sizeBytes: number;
	requestId: string;
	status: OcrStatus;
	parsed: boolean;
	createdAt: Date;
};

export type OcrUploadInput = {
	fileName: string;
	mimeType: string;
	sizeBytes: number;
	buffer: Buffer;
};

export type OcrSubmissionResult = {
	id: number;
	requestId: string;
	requestCheckUrl: string;
	status: OcrStatus;
};

export type OcrResultPayload = {
	status?: string;
	success?: boolean;
	error?: string | null;
	markdown?: string | null;
	html?: string | null;
	json?: Record<string, unknown> | string | null;
	pages?: Array<Record<string, unknown>> | null;
	request_id?: string;
	request_check_url?: string;
};

export type OcrLookupResult = {
	request: OcrRequestRecord;
	result: OcrResultPayload;
	content: string | null;
};
