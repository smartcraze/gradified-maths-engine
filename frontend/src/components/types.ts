export type ApiResponse<T = unknown> = {
	success: boolean;
	message: string;
	data?: T;
	errors?: unknown;
};

export type OcrResponse = {
	slug: string;
	request_id: string;
	id: null;
	rawmarkdown: string | null;
	equations: unknown[];
};

export type QuestionEvaluation = {
	question_id: string;
	max_marks: number;
	marks_awarded: number;
	answer_type: "mcq" | "numerical" | "short" | "long";
	correctness: "correct" | "partially_correct" | "incorrect";
	correct_option: string | null;
	student_option: string | null;
	steps_analysis: Array<{ step: string; is_correct: boolean; marks: number }> | null;
	key_points_covered: string[] | null;
	key_points_missing: string[] | null;
	feedback: { strengths: string; improvements: string } | null;
};

export type Evaluation = {
	student: {
		name: string | null;
		roll_number: string | null;
		registration_number: string | null;
		class: string | null;
		subject: string | null;
	} | null;
	summary: {
		total_questions: number;
		total_max_marks: number;
		total_awarded_marks: number;
		percentage: number;
	};
	evaluation: QuestionEvaluation[];
	overall_feedback: string;
};
