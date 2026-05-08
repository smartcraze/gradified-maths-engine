import type { OcrRequestRecord, OcrStatus } from "./type";

type CreateOcrRequestInput = {
	fileName: string;
	mimeType: string;
	sizeBytes: number;
	requestId: string;
	status?: OcrStatus;
	parsed?: boolean;
};

type UpdateOcrRequestInput = {
	status?: OcrStatus;
	parsed?: boolean;
};

const ocrStore = new Map<number, OcrRequestRecord>();
let ocrIdCounter = 1;

function buildOcrRecord(id: number, input: CreateOcrRequestInput): OcrRequestRecord {
	return {
		id,
		fileName: input.fileName,
		mimeType: input.mimeType,
		sizeBytes: input.sizeBytes,
		requestId: input.requestId,
		status: input.status ?? "processing",
		parsed: input.parsed ?? false,
		createdAt: new Date(),
	};
}

export function createOcrRepository() {
	async function createOcrRequest(input: CreateOcrRequestInput): Promise<OcrRequestRecord> {
		const id = ocrIdCounter++;
		const record = buildOcrRecord(id, input);
		ocrStore.set(id, record);
		return record;
	}

	async function findOcrRequestById(id: number): Promise<OcrRequestRecord | null> {
		return ocrStore.get(id) ?? null;
	}

	async function findOcrRequestByRequestId(requestId: string): Promise<OcrRequestRecord | null> {
		for (const record of ocrStore.values()) {
			if (record.requestId === requestId) {
				return record;
			}
		}

		return null;
	}

	async function updateOcrRequestById(id: number, input: UpdateOcrRequestInput): Promise<OcrRequestRecord | null> {
		const record = ocrStore.get(id);
		if (!record) {
			return null;
		}

		const updated: OcrRequestRecord = {
			...record,
			status: input.status ?? record.status,
			parsed: input.parsed ?? record.parsed,
		};

		ocrStore.set(id, updated);
		return updated;
	}

	return {
		createOcrRequest,
		findOcrRequestById,
		findOcrRequestByRequestId,
		updateOcrRequestById,
	};
}
