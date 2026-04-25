import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { GRADE_MODEL } from "@/config/constant";
import { buildStructurePrompt, STRUCTURE_SYSTEM_PROMPT } from "./prompt";
import { type StructuredExam, StructuredExamSchema } from "./schema";

type GetStructuredExamDataInput = {
	questionPaper: string;
	modelAnswers: string;
};

/**
 * Converts raw question paper and model answers into structured exam JSON.
 *
 * @param questionPaper Raw question paper text.
 * @param modelAnswers Raw model answer text.
 * @returns A validated structured exam object.
 */
export async function getStructuredExamData(questionPaper: string, modelAnswers: string): Promise<StructuredExam> {
	const prompt = buildStructurePrompt({ questionPaper, modelAnswers });

	const { output } = await generateText({
		model: openai(GRADE_MODEL),
		system: STRUCTURE_SYSTEM_PROMPT,
		prompt,
		output: Output.object({
			schema: StructuredExamSchema,
		}),
	});

	return output;
}

/**
 * Convenience wrapper to get structured exam data from a named input object.
 *
 * @param questionPaper Raw question paper text.
 * @param modelAnswers Raw model answer text.
 * @returns A validated structured exam object.
 */
export async function getStructuredExamDataFromInput({
	questionPaper,
	modelAnswers,
}: GetStructuredExamDataInput): Promise<StructuredExam> {
	return getStructuredExamData(questionPaper, modelAnswers);
}
