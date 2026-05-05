import { requestStructuredExamData } from "./llm";
import { normalizeStructuredExamOutput, preprocessExamText } from "./normalization";
import { type StructureRepository, structureRepository } from "./repository";
import { type StructuredExam, StructuredExamSchema } from "./schema";

type GetStructuredExamDataOptions = {
	ocrRequestId?: number;
	repository?: StructureRepository;
};

/**
 * Converts raw question paper and model answers into structured exam JSON.
 *
 * @param questionPaper Raw question paper text.
 * @param modelAnswers Raw model answer text.
 * @returns A validated structured exam object.
 */
export async function getStructuredExamData(
	questionPaper: string,
	modelAnswers: string,
	options: GetStructuredExamDataOptions = {},
): Promise<StructuredExam> {
	const cleanQuestionPaper = preprocessExamText(questionPaper);
	const cleanModelAnswers = preprocessExamText(modelAnswers);
	const repository = options.repository ?? structureRepository;

	try {
		const output = await requestStructuredExamData({
			questionPaper: cleanQuestionPaper,
			modelAnswers: cleanModelAnswers,
		});

		const normalizedExam = normalizeStructuredExamOutput(output);
		const parsedExam = StructuredExamSchema.parse(normalizedExam);

		if (options.ocrRequestId !== undefined) {
			await repository.saveStructuredExam({
				ocrRequestId: options.ocrRequestId,
				structuredExam: parsedExam,
				sourceText: cleanQuestionPaper,
			});
		}

		return parsedExam;
	} catch {
		const output = await requestStructuredExamData({
			questionPaper: cleanQuestionPaper,
			modelAnswers: cleanModelAnswers,
			rubricNotes:
				"Previous extraction was inconsistent. Re-check section typing, question formats, and metadata totals carefully.",
		});

		const normalizedExam = normalizeStructuredExamOutput(output);
		const parsedExam = StructuredExamSchema.parse(normalizedExam);

		if (options.ocrRequestId !== undefined) {
			await repository.saveStructuredExam({
				ocrRequestId: options.ocrRequestId,
				structuredExam: parsedExam,
				sourceText: cleanQuestionPaper,
			});
		}

		return parsedExam;
	}
}

export async function getStoredStructuredExamData(
	ocrRequestId: number,
	repository = structureRepository,
): Promise<StructuredExam | null> {
	return repository.findStructuredExamByOcrRequestId(ocrRequestId);
}
