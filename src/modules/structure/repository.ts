import { eq } from "drizzle-orm";
import { db } from "@/config/db";
import { questionsPaper } from "@/db/schema";
import { type StructuredExam, StructuredExamSchema } from "./schema";

export type StructuredExamPaperRecord = {
	id: number;
	ocr_request_id: number;
	question_number: number;
	content: string;
	structure_question: StructuredExam;
	metadata: Record<string, unknown> | null;
};

export type StructureRepository = {
	saveStructuredExam(input: {
		ocrRequestId: number;
		structuredExam: StructuredExam;
		sourceText?: string;
	}): Promise<StructuredExam>;
	findStructuredExamPaperRecordByOcrRequestId(ocrRequestId: number): Promise<StructuredExamPaperRecord | null>;
	findStructuredExamByOcrRequestId(ocrRequestId: number): Promise<StructuredExam | null>;
};

function parseStructuredExam(value: unknown): StructuredExam {
	return StructuredExamSchema.parse(value);
}

function buildStructuredExamRecord(input: {
	id: number;
	ocrRequestId: number;
	sourceText: string;
	structuredExam: StructuredExam;
}): StructuredExamPaperRecord {
	return {
		id: input.id,
		ocr_request_id: input.ocrRequestId,
		question_number: 0,
		content: input.sourceText,
		structure_question: input.structuredExam,
		metadata: null,
	};
}

export function createStructureRepository(database = db): StructureRepository {
	async function findStructuredExamPaperRecordByOcrRequestId(
		ocrRequestId: number,
	): Promise<StructuredExamPaperRecord | null> {
		const [row] = await database.select().from(questionsPaper).where(eq(questionsPaper.ocr_request_id, ocrRequestId));

		if (!row) {
			return null;
		}

		return buildStructuredExamRecord({
			id: row.id,
			ocrRequestId: row.ocr_request_id,
			sourceText: row.content,
			structuredExam: parseStructuredExam(row.structure_question),
		});
	}

	return {
		async saveStructuredExam({ ocrRequestId, structuredExam, sourceText }) {
			const structuredExamJson = parseStructuredExam(structuredExam);

			await database.transaction(async (transaction) => {
				await transaction.delete(questionsPaper).where(eq(questionsPaper.ocr_request_id, ocrRequestId));
				await transaction.insert(questionsPaper).values({
					ocr_request_id: ocrRequestId,
					question_number: 0,
					content: sourceText ?? JSON.stringify(structuredExamJson),
					structure_question: structuredExamJson,
					metadata: null,
				});
			});

			return structuredExamJson;
		},
		async findStructuredExamByOcrRequestId(ocrRequestId) {
			const record = await findStructuredExamPaperRecordByOcrRequestId(ocrRequestId);
			return record?.structure_question ?? null;
		},
		async findStructuredExamPaperRecordByOcrRequestId(ocrRequestId) {
			return findStructuredExamPaperRecordByOcrRequestId(ocrRequestId);
		},
	};
}

export const structureRepository = createStructureRepository();
