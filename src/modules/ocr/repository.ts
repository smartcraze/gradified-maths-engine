import { eq } from "drizzle-orm";
import { db } from "@/config/db";
import { ocrRequests } from "@/db/schema";
import type { OcrRequestRecord, OcrStatus } from "./type";

type Database = typeof db;

type OcrRequestRow = typeof ocrRequests.$inferSelect;

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

function mapOcrRequest(row: OcrRequestRow): OcrRequestRecord {
	return {
		id: row.id,
		fileName: row.file_name,
		mimeType: row.mime_type,
		sizeBytes: row.size_bytes,
		requestId: row.request_id,
		status: row.status as OcrStatus,
		parsed: row.parsed,
		createdAt: row.created_at,
	};
}

export function createOcrRepository(database: Database = db) {
	async function createOcrRequest(input: CreateOcrRequestInput): Promise<OcrRequestRecord> {
		const [row] = await database
			.insert(ocrRequests)
			.values({
				file_name: input.fileName,
				mime_type: input.mimeType,
				size_bytes: input.sizeBytes,
				request_id: input.requestId,
				status: input.status ?? "processing",
				parsed: input.parsed ?? false,
			})
			.returning();

		if (!row) {
			throw new Error("Failed to create OCR request record");
		}

		return mapOcrRequest(row);
	}

	async function findOcrRequestById(id: number): Promise<OcrRequestRecord | null> {
		const [row] = await database.select().from(ocrRequests).where(eq(ocrRequests.id, id)).limit(1);
		return row ? mapOcrRequest(row) : null;
	}

	async function findOcrRequestByRequestId(requestId: string): Promise<OcrRequestRecord | null> {
		const [row] = await database.select().from(ocrRequests).where(eq(ocrRequests.request_id, requestId)).limit(1);
		return row ? mapOcrRequest(row) : null;
	}

	async function updateOcrRequestById(id: number, input: UpdateOcrRequestInput): Promise<OcrRequestRecord | null> {
		const [row] = await database
			.update(ocrRequests)
			.set({
				...(input.status ? { status: input.status } : {}),
				...(input.parsed !== undefined ? { parsed: input.parsed } : {}),
			})
			.where(eq(ocrRequests.id, id))
			.returning();

		return row ? mapOcrRequest(row) : null;
	}

	return {
		createOcrRequest,
		findOcrRequestById,
		findOcrRequestByRequestId,
		updateOcrRequestById,
	};
}
