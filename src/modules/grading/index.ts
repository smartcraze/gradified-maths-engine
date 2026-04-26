import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { GRADE_MODEL } from "@/config/constant";
import { logLlmResponse } from "@/core/utils/llm-response-logger";
import { getStructuredExamData } from "../structure";
import { MODEL_ANSWER, QUESTIONS } from "../structure/input";
import { buildGradingPrompt, GRADING_SYSTEM_PROMPT } from "./prompt";
import { type Evaluation, EvaluationSchema, NonMcqEvaluationSchema, type QuestionEvaluation } from "./schema";
import { STUDENT_ANSWER_SHEET } from "./student-sheet";
import { evaluateMcqQuestions, splitExamByQuestionType } from "./tools";

type GradeStudentAnswerSheetInput = {
	questionPaper: string;
	modelAnswers: string;
	studentAnswerSheet: string;
};

/**
 * Evaluates a student's answer sheet using hybrid grading.
 *
 * MCQ questions are graded by deterministic tool logic, and non-MCQ questions
 * are graded by the model using structured output.
 *
 * @param questionPaper Raw question paper text.
 * @param modelAnswers Raw model answer text.
 * @param studentAnswerSheet Raw student answer sheet text.
 * @returns The final merged and validated evaluation result.
 */
export async function gradeStudentAnswerSheet({
	questionPaper,
	modelAnswers,
	studentAnswerSheet,
}: GradeStudentAnswerSheetInput): Promise<Evaluation> {
	const structuredExamData = await getStructuredExamData(questionPaper, modelAnswers);
	const mcqEvaluations = await evaluateMcqQuestions({ structuredExamData, studentAnswerSheet });
	const { nonMcqExam } = splitExamByQuestionType(structuredExamData);

	let aiEvaluation: {
		student: Evaluation["student"];
		evaluation: QuestionEvaluation[];
		overall_feedback: string;
	} = {
		student: null,
		evaluation: [],
		overall_feedback: "MCQ questions were graded using deterministic option matching.",
	};

	if (nonMcqExam.metadata.total_questions > 0) {
		const prompt = buildGradingPrompt({
			structuredExamData: JSON.stringify(nonMcqExam),
			studentAnswerSheet,
		});

		const { output } = await generateText({
			model: openai(GRADE_MODEL),
			system: GRADING_SYSTEM_PROMPT,
			prompt,
			output: Output.object({ schema: NonMcqEvaluationSchema }),
			temperature: 0,
		});

		aiEvaluation = output;
	}

	const mergedEvaluation = [...mcqEvaluations, ...aiEvaluation.evaluation].sort((a, b) => {
		const first = Number(a.question_id);
		const second = Number(b.question_id);

		if (Number.isNaN(first) || Number.isNaN(second)) {
			return a.question_id.localeCompare(b.question_id);
		}

		return first - second;
	});

	const totalMaxMarks = mergedEvaluation.reduce((total, question) => total + question.max_marks, 0);
	const totalAwardedMarks = mergedEvaluation.reduce((total, question) => total + question.marks_awarded, 0);
	const percentage = totalMaxMarks === 0 ? 0 : Number(((totalAwardedMarks / totalMaxMarks) * 100).toFixed(2));

	const finalResult: Evaluation = {
		student: aiEvaluation.student,
		summary: {
			total_questions: mergedEvaluation.length,
			total_max_marks: totalMaxMarks,
			total_awarded_marks: totalAwardedMarks,
			percentage,
		},
		evaluation: mergedEvaluation,
		overall_feedback: aiEvaluation.overall_feedback,
	};

	const parsedFinalResult = EvaluationSchema.parse(finalResult);

	await logLlmResponse({
		module: "grading",
		model: GRADE_MODEL,
		response: {
			final_summary: parsedFinalResult.summary,
			student: parsedFinalResult.student,
			overall_feedback: parsedFinalResult.overall_feedback,
			mcq_evaluation: mcqEvaluations,
			non_mcq_evaluation: aiEvaluation.evaluation,
		},
		metadata: {
			totalQuestions: parsedFinalResult.summary.total_questions,
			mcqQuestionCount: mcqEvaluations.length,
			nonMcqQuestionCount: aiEvaluation.evaluation.length,
		},
	});

	return parsedFinalResult;
}

/**
 * Runs a local grading demo using sample inputs and prints the result.
 *
 * @returns Promise that resolves when demo execution completes.
 */
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
