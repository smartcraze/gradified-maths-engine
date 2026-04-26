import { requestStructuredExamData } from "./llm";
import { normalizeStructuredExamOutput, preprocessExamText } from "./normalization";
import { type StructuredExam, StructuredExamSchema } from "./schema";

/**
 * Converts raw question paper and model answers into structured exam JSON.
 *
 * @param questionPaper Raw question paper text.
 * @param modelAnswers Raw model answer text.
 * @returns A validated structured exam object.
 */
export async function getStructuredExamData(questionPaper: string, modelAnswers: string): Promise<StructuredExam> {
	const cleanQuestionPaper = preprocessExamText(questionPaper);
	const cleanModelAnswers = preprocessExamText(modelAnswers);

	try {
		const output = await requestStructuredExamData({
			questionPaper: cleanQuestionPaper,
			modelAnswers: cleanModelAnswers,
		});

		const normalizedExam = normalizeStructuredExamOutput(output);
		return StructuredExamSchema.parse(normalizedExam);
	} catch {
		const output = await requestStructuredExamData({
			questionPaper: cleanQuestionPaper,
			modelAnswers: cleanModelAnswers,
			rubricNotes:
				"Previous extraction was inconsistent. Re-check section typing, question formats, and metadata totals carefully.",
		});

		const normalizedExam = normalizeStructuredExamOutput(output);
		return StructuredExamSchema.parse(normalizedExam);
	}
}
