import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { GRADE_MODEL } from "@/config/constant";
import { buildStructurePrompt, STRUCTURE_SYSTEM_PROMPT } from "./prompt";
import { type StructuredExam, StructuredExamSchema } from "./schema";

type GetStructuredExamDataInput = {
	questionPaper: string;
	modelAnswers: string;
};

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

export async function getStructuredExamDataFromInput({
	questionPaper,
	modelAnswers,
}: GetStructuredExamDataInput): Promise<StructuredExam> {
	return getStructuredExamData(questionPaper, modelAnswers);
}
