import type { StructuredExam } from "./schema";

type SectionType = StructuredExam["sections"][number]["type"];
type StructuredQuestion = StructuredExam["sections"][number]["questions"][number];

/**
 * Cleans noisy OCR-like text before sending it to the model.
 *
 * Normalizes line endings, compresses spacing noise, and removes
 * excessive blank lines so the prompt is more stable.
 */
export function preprocessExamText(rawText: string): string {
	return rawText
		.replace(/\r\n/g, "\n")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/**
 * Infers a CBSE-aligned section type from a representative mark value.
 */
function inferByMarks(marks: number): SectionType {
	if (marks === 1) {
		return "mcq";
	}

	if (marks === 2) {
		return "very_short";
	}

	if (marks === 3) {
		return "short";
	}

	return "long";
}

/**
 * Infers section type using section title first, then marks fallback.
 */
function inferSectionType(sectionName: string, marks: number[]): SectionType {
	const name = sectionName.toLowerCase();

	if (name.includes("mcq")) {
		return "mcq";
	}

	if (name.includes("very short")) {
		return "very_short";
	}

	if (name.includes("short")) {
		return "short";
	}

	if (name.includes("long")) {
		return "long";
	}

	if (name.includes("case")) {
		return "case_study";
	}

	const firstMark = marks.find((value) => Number.isFinite(value));
	return inferByMarks(firstMark ?? 3);
}

/**
 * Normalizes section types to ensure deterministic CBSE-style labels.
 */
function normalizeSectionTypes(exam: StructuredExam): StructuredExam {
	return {
		...exam,
		sections: exam.sections.map((section) => {
			const marks = section.questions.map((question) => question.max_marks);

			return {
				...section,
				type: inferSectionType(section.section_name, marks),
			};
		}),
	};
}

/**
 * Infers answer format from explicit options and question marks.
 */
function inferQuestionFormatFromContent(question: StructuredQuestion) {
	if (question.options.length > 0) {
		return "mcq" as const;
	}

	if (question.max_marks >= 4) {
		return "long" as const;
	}

	if (question.max_marks === 3) {
		return "short" as const;
	}

	return "numerical" as const;
}

/**
 * Recursively normalizes a single structured question and its children.
 */
function normalizeQuestion(question: StructuredQuestion): StructuredQuestion {
	const normalizedSubQuestions = question.sub_questions.map(normalizeQuestion);

	return {
		...question,
		question_format: inferQuestionFormatFromContent(question),
		sub_questions: normalizedSubQuestions,
	};
}

/**
 * Recursively flattens question trees for metadata calculations.
 */
function flattenQuestions(questions: StructuredQuestion[]): StructuredQuestion[] {
	return questions.flatMap((question) => [question, ...flattenQuestions(question.sub_questions)]);
}

/**
 * Rebuilds metadata totals and applies recursive question normalization.
 */
function normalizeExamMetadata(exam: StructuredExam): StructuredExam {
	const normalizedSections = exam.sections.map((section) => ({
		...section,
		questions: section.questions.map(normalizeQuestion),
	}));

	const allQuestions = normalizedSections.flatMap((section) => flattenQuestions(section.questions));
	const totalMarks = allQuestions.reduce((sum, question) => sum + question.max_marks, 0);

	return {
		...exam,
		sections: normalizedSections,
		metadata: {
			total_questions: allQuestions.length,
			total_marks: totalMarks,
		},
	};
}

/**
 * Applies all deterministic normalization steps to raw model output.
 */
export function normalizeStructuredExamOutput(exam: StructuredExam): StructuredExam {
	return normalizeExamMetadata(normalizeSectionTypes(exam));
}
