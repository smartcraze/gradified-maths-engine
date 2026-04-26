export type BuildStructureSystemPromptOptions = {
	subject?: string;
	rubricStrictness?: "balanced" | "strict";
	preferStepExtraction?: boolean;
};

export function buildStructureSystemPrompt({
	subject = "MATHEMATICS",
	rubricStrictness = "strict",
	preferStepExtraction = true,
}: BuildStructureSystemPromptOptions = {}) {
	const strictnessInstruction =
		rubricStrictness === "strict"
			? "When uncertain, choose conservative extraction and never hallucinate missing values."
			: "Use best-effort extraction while preserving mathematical intent.";

	const stepInstruction = preferStepExtraction
		? "For non-MCQ questions, extract expected_steps as concise marking checkpoints in solving order."
		: "Set expected_steps to [] when reliable step extraction is not possible.";

	return `
You are a structuring agent that converts raw exam artifacts into a grading-ready JSON object.

INPUTS YOU RECEIVE
- Question paper text
- Model answer text
- Content may be noisy (OCR fragments, merged lines, missing separators)

DOMAIN
- Subject: ${subject}
- Primary focus: preserve mathematical meaning and grading intent.

MATH NORMALIZATION RULES
- Preserve expression meaning for LaTeX/Unicode/OCR math.
- Keep fractions, powers, radicals, sets, limits, matrices, signs, and brackets intact.
- Normalize only when intent is unambiguous.
- Never drop operators/terms that affect correctness.

STRUCTURING GOALS
- Align each question with its model answer and max marks.
- Preserve original section order and question order.
- Keep model answers complete enough for grading.
- Infer section type using CBSE pattern: mcq | very_short | short | long | case_study.
- Infer question_format accurately: mcq | numerical | short | long.
- Infer question_type accurately: numerical | algebraic | proof | theory | mixed.
- Extract final_answer only if explicitly derivable from model answer; otherwise null.
- ${stepInstruction}
- Extract key_concepts (formula names, theorems, methods) as short labels.

OUTPUT CONTRACT (STRICT)
- Return only valid JSON matching the schema.
- No markdown, prose, or extra keys.
- Every question must include all required fields.
- Use [] for non-applicable arrays and null for unknown nullable values.
- marks_inferred must be true only when max_marks is guessed.
- Do not merge or skip questions.

MCQ RULES
- question_format must be "mcq" when options are present.
- options must be ["A","B","C","D"] for MCQs and [] for non-MCQs.

SECTION TYPE RULES
- Infer section.type from section_name first:
  - contains "mcq" => "mcq"
  - contains "very short" => "very_short"
  - contains "short" => "short"
  - contains "long" => "long"
  - contains "case" => "case_study"
- If section_name is unclear, infer from marks pattern:
  - marks 1 => "mcq"
  - marks 2 => "very_short"
  - marks 3 => "short"
  - marks >= 4 => "long"

SCORING CONSISTENCY
- metadata.total_questions equals total flattened questions including sub-questions.
- metadata.total_marks equals sum of max_marks across flattened questions.

RUBRIC STRICTNESS
- ${strictnessInstruction}
`;
}

export const STRUCTURE_SYSTEM_PROMPT = buildStructureSystemPrompt();

export type BuildStructurePromptInput = {
	questionPaper: string;
	modelAnswers: string;
	rubricNotes?: string;
};

/**
 * Builds the user prompt for the structuring model.
 *
 * @param questionPaper Raw question paper text.
 * @param modelAnswers Raw model answer text.
 * @returns A prompt string instructing the model to produce structured exam JSON.
 */
export function buildStructurePrompt({ questionPaper, modelAnswers, rubricNotes }: BuildStructurePromptInput): string {
	return `
You are given a question paper and model answers.
Your task is to convert this raw exam data into a grading-ready structured object following the strict schema contract provided.

GRADING-ORIENTED EXTRACTION PRIORITIES
- Preserve math fidelity over textual polish.
- Include expected_steps and key_concepts to help downstream partial-marking.
- Extract final_answer when confidently available.

ADDITIONAL RUBRIC NOTES
${rubricNotes ?? "None"}

Question Paper:
${questionPaper}

-----------------

Model Answers:
${modelAnswers}
`;
}
