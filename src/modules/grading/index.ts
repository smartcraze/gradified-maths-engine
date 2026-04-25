import { type OpenAILanguageModelResponsesOptions, openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { EvaluationSchema } from "./output-schema";
import { SYSTEM_PROMPT } from "./promt";
import { STUDENT_ANSWER_SHEET } from "./student-sheet";

const StructureResponse = "";

const outputPrompt = `
Evaluate the student answer s   heet using the provided structured exam data.

-------------------------
STRUCTURED EXAM DATA
(questions, model answers, marks)
-------------------------
${StructureResponse}

-------------------------
STUDENT ANSWER SHEET
-------------------------
${STUDENT_ANSWER_SHEET}

-------------------------
TASK
-------------------------
Evaluate all answers and return the result strictly following the EvaluationSchema.
`;

const { output } = await generateText({
	model: openai("gpt-4.1"),
	system: SYSTEM_PROMPT,
	prompt: outputPrompt,
	output: Output.object({
		schema: EvaluationSchema,
	}),
	providerOptions: {
		openai: {
			reasoningEffort: "low",
		} satisfies OpenAILanguageModelResponsesOptions,
	},
});

console.log(output);
