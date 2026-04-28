import { devToolsMiddleware } from "@ai-sdk/devtools";
import { type OpenAILanguageModelResponsesOptions, openai } from "@ai-sdk/openai";
import { generateText, Output, wrapLanguageModel } from "ai";
import { GRADE_MODEL } from "@/config/constant";
import { env } from "@/config/env";
import { buildGradingPrompt, GRADING_SYSTEM_PROMPT } from "./prompt";
import { type Evaluation, NonMcqEvaluationSchema, type QuestionEvaluation } from "./schema";

type NonMcqExamInput = {
	sections: unknown[];
	metadata: {
		total_questions: number;
		total_marks: number;
	};
};

export type NonMcqEvaluationOutput = {
	student: Evaluation["student"];
	evaluation: QuestionEvaluation[];
	overall_feedback: string;
};

const baseGradeModel = openai(GRADE_MODEL);

const gradeModel =
	env.NODE_ENV === "production"
		? baseGradeModel
		: wrapLanguageModel({
				model: baseGradeModel,
				middleware: devToolsMiddleware(),
			});

/**
 * Provides the default non-MCQ evaluation payload used when no non-MCQ items exist.
 */
export function createDefaultNonMcqEvaluation(): NonMcqEvaluationOutput {
	return {
		student: null,
		evaluation: [],
		overall_feedback: "MCQ questions were graded using deterministic option matching.",
	};
}

/**
 * Requests non-MCQ grading from the LLM and returns schema-constrained output.
 */
export async function requestNonMcqEvaluation({
	nonMcqExam,
	studentAnswerSheet,
}: {
	nonMcqExam: NonMcqExamInput;
	studentAnswerSheet: string;
}): Promise<NonMcqEvaluationOutput> {
	if (nonMcqExam.metadata.total_questions <= 0) {
		return createDefaultNonMcqEvaluation();
	}

	const prompt = buildGradingPrompt({
		structuredExamData: JSON.stringify(nonMcqExam),
		studentAnswerSheet,
	});

	const { output } = await generateText({
		model: gradeModel,
		system: GRADING_SYSTEM_PROMPT,
		prompt,
		output: Output.object({ schema: NonMcqEvaluationSchema }),
		temperature: 0,
		providerOptions: {
			openai: {
				reasoningEffort: "medium",
			} satisfies OpenAILanguageModelResponsesOptions,
		},
	});

	return output;
}
