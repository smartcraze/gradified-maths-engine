import { env } from "@/config/env";
import { createOcrRepository } from "./repository";
import type { OcrLookupResult, OcrResultPayload, OcrSubmissionResult, OcrUploadInput } from "./type";

const DATALAB_CONVERT_URL = "https://www.datalab.to/api/v1/convert";

function buildContentFromResult(result: OcrResultPayload): string | null {
	if (typeof result.markdown === "string" && result.markdown.length > 0) {
		return result.markdown;
	}

	if (typeof result.html === "string" && result.html.length > 0) {
		return result.html;
	}

	if (typeof result.json === "string" && result.json.length > 0) {
		return result.json;
	}

	if (result.json && typeof result.json === "object") {
		return JSON.stringify(result.json);
	}

	return null;
}

function normalizeOcrStatus(status?: string | null): OcrSubmissionResult["status"] {
	const normalizedStatus = status?.trim().toLowerCase();

	if (normalizedStatus === "complete" || normalizedStatus === "completed") {
		return "complete";
	}

	if (normalizedStatus === "failed" || normalizedStatus === "error") {
		return "failed";
	}

	if (normalizedStatus === "processing" || normalizedStatus === "queued" || normalizedStatus === "pending") {
		return "processing";
	}

	return "processing";
}

async function submitOcrRequest(
	input: OcrUploadInput,
): Promise<{ requestId: string; requestCheckUrl: string; result: OcrResultPayload }> {
	const formData = new FormData();
	formData.append("file", new Blob([new Uint8Array(input.buffer)], { type: input.mimeType }), input.fileName);
	formData.append("output_format", "markdown");

	const response = await fetch(DATALAB_CONVERT_URL, {
		method: "POST",
		headers: {
			"X-API-Key": env.DATALAB_API_KEY,
		},
		body: formData,
	});

	if (!response.ok) {
		const errorBody = await response.text();
		throw new Error(`OCR submission failed: ${response.status} ${response.statusText} - ${errorBody}`);
	}

	const result = (await response.json()) as OcrResultPayload;
	const requestId = result.request_id;
	const requestCheckUrl = result.request_check_url;

	if (!requestId || !requestCheckUrl) {
		throw new Error("OCR submission response was missing request identifiers");
	}

	return { requestId, requestCheckUrl, result };
}

async function fetchOcrRequestResult(requestId: string): Promise<OcrResultPayload> {
	const response = await fetch(`${DATALAB_CONVERT_URL}/${requestId}`, {
		headers: {
			"X-API-Key": env.DATALAB_API_KEY,
		},
	});

	if (!response.ok) {
		const errorBody = await response.text();
		throw new Error(`OCR lookup failed: ${response.status} ${response.statusText} - ${errorBody}`);
	}

	return (await response.json()) as OcrResultPayload;
}

export async function processOCR(input: OcrUploadInput): Promise<OcrSubmissionResult> {
	const repository = createOcrRepository();
	const submission = await submitOcrRequest(input);
	const savedRequest = await repository.createOcrRequest({
		fileName: input.fileName,
		mimeType: input.mimeType,
		sizeBytes: input.sizeBytes,
		requestId: submission.requestId,
		status: normalizeOcrStatus(submission.result.status),
		parsed: false,
	});

	return {
		id: savedRequest.id,
		requestId: savedRequest.requestId,
		requestCheckUrl: submission.requestCheckUrl,
		status: savedRequest.status,
	};
}

export async function getOCRResult(ocrRequestId: number): Promise<OcrLookupResult | null> {
	const repository = createOcrRepository();
	const request = await repository.findOcrRequestById(ocrRequestId);

	if (!request) {
		return null;
	}

	const result = await fetchOcrRequestResult(request.requestId);
	const status = normalizeOcrStatus(result.status);
	const parsed = status === "complete";

	if (request.status !== status || request.parsed !== parsed) {
		await repository.updateOcrRequestById(request.id, { status, parsed });
	}

	return {
		request: {
			...request,
			status,
			parsed,
		},
		result,
		content: buildContentFromResult(result),
	};
}
