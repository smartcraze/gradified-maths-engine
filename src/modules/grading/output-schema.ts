import { z } from "zod";

export const QuestionEvaluationSchema = z
	.object({
		question_id: z.string().describe("Unique identifier of the question being evaluated."),
		max_marks: z.number().describe("Maximum marks available for this question."),
		marks_awarded: z
			.number()
			.describe("Marks awarded to the student for this question. Must be between 0 and max_marks.")
			.min(0),
		answer_type: z.enum(["mcq", "numerical", "short", "long"]).describe("Type of answer expected for the question."),
		correctness: z
			.enum(["correct", "partially_correct", "incorrect"])
			.describe("Overall correctness classification of the student's response."),
		correct_option: z.string().nullable().describe("Correct option for objective questions (if applicable)."),
		student_option: z
			.string()
			.nullable()
			.describe("Option selected by the student for objective questions (if applicable)."),

		steps_analysis: z
			.array(
				z
					.object({
						step: z.string().describe("One evaluation step or reasoning point considered during marking."),
						is_correct: z.boolean().describe("Whether this individual step is correct."),
						marks: z.number().describe("Marks allocated for this specific step."),
					})
					.describe("Step-level breakdown item for analytical marking."),
			)
			.nullable()
			.describe("Optional step-wise analysis for descriptive or numerical answers."),

		key_points_covered: z
			.array(z.string())
			.nullable()
			.describe("Important expected points that the student answer includes."),
		key_points_missing: z
			.array(z.string())
			.nullable()
			.describe("Important expected points missing from the student answer."),

		feedback: z
			.object({
				strengths: z.string().describe("What the student did well for this question."),
				improvements: z.string().describe("How the student can improve for this question."),
			})
			.describe("Question-level feedback for the student."),
	})
	.describe("Evaluation details for a single question.")

	.superRefine((data, ctx) => {
		if (data.marks_awarded > data.max_marks) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["marks_awarded"],
				message: "marks_awarded cannot exceed max_marks",
			});
		}
	});

export const StudentSchema = z
	.object({
		name: z.string().nullable().describe("Student full name."),
		roll_number: z.string().nullable().describe("Institution roll number of the student."),
		registration_number: z.string().nullable().describe("Registration or enrollment number of the student."),
		class: z.string().nullable().describe("Class or grade of the student."),
		subject: z.string().nullable().describe("Subject for which this evaluation is generated."),
	})
	.describe("Basic student metadata.");

export const EvaluationSchema = z
	.object({
		student: StudentSchema.nullable().describe("Optional student identity and context information."),
		summary: z
			.object({
				total_questions: z.number().describe("Total number of evaluated questions."),
				total_max_marks: z.number().describe("Sum of max marks across all evaluated questions."),
				total_awarded_marks: z.number().describe("Sum of marks awarded across all evaluated questions."),
				percentage: z.number().describe("Overall score percentage in the range 0 to 100."),
			})
			.describe("Aggregated scoring summary."),

		evaluation: z.array(QuestionEvaluationSchema).describe("List of per-question evaluation entries."),

		overall_feedback: z.string().describe("Overall feedback summary for the entire response sheet."),
	})
	.describe("Complete evaluation output schema for one student's assessment.");
