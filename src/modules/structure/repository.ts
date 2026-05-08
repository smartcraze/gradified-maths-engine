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

const structuredExamStore = new Map<number, StructuredExamPaperRecord>();
let structuredExamId = 1;

export function createStructureRepository(): StructureRepository {
	async function findStructuredExamPaperRecordByOcrRequestId(
		ocrRequestId: number,
	): Promise<StructuredExamPaperRecord | null> {
		return structuredExamStore.get(ocrRequestId) ?? null;
	}

	return {
		async saveStructuredExam({ ocrRequestId, structuredExam, sourceText }) {
			const structuredExamJson = parseStructuredExam(structuredExam);
			const record = buildStructuredExamRecord({
				id: structuredExamId++,
				ocrRequestId,
				sourceText: sourceText ?? JSON.stringify(structuredExamJson),
				structuredExam: structuredExamJson,
			});

			structuredExamStore.set(ocrRequestId, record);
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
