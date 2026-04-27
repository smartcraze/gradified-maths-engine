import { devToolsMiddleware } from "@ai-sdk/devtools";
import { openai } from "@ai-sdk/openai";
import { generateText, Output, wrapLanguageModel } from "ai";
import { STRUCTURE_MODEL } from "@/config/constant";
import { env } from "@/config/env";
import { buildStructurePrompt, STRUCTURE_SYSTEM_PROMPT } from "./prompt";
import { type StructuredExam, StructuredExamSchema } from "./schema";

const baseStructureModel = openai(STRUCTURE_MODEL);

const structureModel =
	env.NODE_ENV === "production"
		? baseStructureModel
		: wrapLanguageModel({
				model: baseStructureModel,
				middleware: devToolsMiddleware(),
			});

type RequestStructuredExamDataInput = {
	questionPaper: string;
	modelAnswers: string;
	rubricNotes?: string;
};

/**
 * Requests structured exam JSON from the language model using the strict schema.
 * This function is intentionally focused only on model interaction.
 */
export async function requestStructuredExamData({
	questionPaper,
	modelAnswers,
	rubricNotes,
}: RequestStructuredExamDataInput): Promise<StructuredExam> {
	const prompt = buildStructurePrompt({ questionPaper, modelAnswers, rubricNotes });

	const { output } = await generateText({
		model: structureModel,
		system: STRUCTURE_SYSTEM_PROMPT,
		prompt,
		output: Output.object({
			schema: StructuredExamSchema,
		}),
	});

	return output;
}
