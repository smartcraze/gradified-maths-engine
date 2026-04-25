import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { GRADE_MODEL } from "@/config/constant";
import { getStructuredExamData } from "../structure";
import { MODEL_ANSWER, QUESTIONS } from "../structure/input";
import { buildGradingPrompt, GRADING_SYSTEM_PROMPT } from "./prompt";
import { EvaluationSchema } from "./schema";
import { STUDENT_ANSWER_SHEET } from "./student-sheet";

type GradeStudentAnswerSheetInput = {
	questionPaper: string;
	modelAnswers: string;
	studentAnswerSheet: string;
};

export async function gradeStudentAnswerSheet({
	questionPaper,
	modelAnswers,
	studentAnswerSheet,
}: GradeStudentAnswerSheetInput) {
	const structuredExamData = await getStructuredExamData(questionPaper, modelAnswers);
	const prompt = buildGradingPrompt({
		structuredExamData: JSON.stringify(structuredExamData),
		studentAnswerSheet,
	});

	const { output } = await generateText({
		model: openai(GRADE_MODEL),
		system: GRADING_SYSTEM_PROMPT,
		prompt,
		output: Output.object({ schema: EvaluationSchema }),
		temperature: 0,
	});

	return output;
}

export async function runGradingDemo() {
	const result = await gradeStudentAnswerSheet({
		questionPaper: QUESTIONS,
		modelAnswers: MODEL_ANSWER,
		studentAnswerSheet: STUDENT_ANSWER_SHEET,
	});

	console.log(result);
}

if (import.meta.main) {
	await runGradingDemo();
}
