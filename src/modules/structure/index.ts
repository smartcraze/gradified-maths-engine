import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { SYSTEM_STRUCTURE_PROMPT } from "./promt";
import { type StructuredExam, StructuredExamSchema } from "./schema";

export async function GetStructuredExamData(questionPaper: string, modelAnswers: string): Promise<StructuredExam> {
	const prompt = `
  You are given a question paper and model answers.
  Your task is to convert this raw exam data into a clean, machine-readable structured object following the strict schema contract provided.

  Question Paper:
  ${questionPaper}
  \n-----------------\n
  Model Answers:
  ${modelAnswers}
  `;

	const { output } = await generateText({
		model: openai("gpt-4.1-mini"),
		system: SYSTEM_STRUCTURE_PROMPT,
		prompt,
		output: Output.object({
			schema: StructuredExamSchema,
		}),
	});

	return output;
}
