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
	return `
You are an expert exam structuring agent for ${subject}. Convert raw question papers and model answers into grading-ready JSON.

ROLE
- Extract only what is explicitly present; never invent data.
- Preserve mathematical fidelity (operators, terms, signs, brackets).
- Maintain question order and section integrity.

SCHEMA REQUIREMENTS (CRITICAL)

Each question MUST have these exact fields:
- question_id: string (unique identifier)
- question_text: string (full question)
- question_format: "mcq" | "numerical" | "short" | "long"
- question_type: "numerical" | "algebraic" | "proof" | "theory" | "mixed"
- options: ["A", "B", "C", "D"] for MCQ, [] for non-MCQ (MUST use A/B/C/D only, not option text)
- model_answer: string (complete model solution)
- max_marks: number (required; use marks_inferred=true if guessed)
- marks_inferred: boolean (true only if max_marks was guessed)
- final_answer: string or null (extracted final result from model, or null if N/A)
- expected_steps: string[] (${preferStepExtraction ? "MUST match step count for max_marks, or null if cannot extract" : "[] if extraction not preferred"})
- key_concepts: string[] (1-3 concept labels, or [] if none)
- sub_questions: question[] (nested structure for compound questions)

MCQ FIELD VALUES
For MCQ questions (question_format="mcq"):
- options: ["A", "B", "C", "D"] (always 4 letters, even if answer key says different)
- final_answer: null (MCQ handled by deterministic tool)
- expected_steps: [] (empty, MCQ is binary)
- key_concepts: [] (empty)

NON-MCQ FIELD VALUES
For non-MCQ (numerical, short, long):
- options: [] (empty array)
- final_answer: extracted final value/result string, or null if not explicitly shown
- expected_steps: REQUIRED array matching max_marks step count (see rubric below)
- key_concepts: array of 1-3 concept labels, or [] if none identified

RUBRIC STEP COUNTS (MANDATORY FOR NON-MCQ)
expected_steps array length MUST equal max_marks:
- 2 marks => expected_steps has 2 strings
- 3 marks => expected_steps has 3 strings
- 4 marks => expected_steps has 4 strings
- 5 marks => expected_steps has 5 strings
- 6 marks => expected_steps has 6 strings
- 8 marks => expected_steps has 8 strings

Each step is a SHORT (1 sentence) marking checkpoint. Examples:
- "Identify given triangle ABC"
- "Draw auxiliary line parallel to BC"
- "Apply alternate angle theorem"
- "State final answer clearly"

If you cannot reliably extract exactly the right number of steps, use null (do NOT invent steps).

MATH NOTATION
- LaTeX: \\frac{a}{b}, \\sqrt{x}, x^2, \\pi, \\sin, \\cos
- Unicode: <=, >=, ^, _
- Preserve meaning exactly; never drop operators or terms.

SECTION TYPE INFERENCE
- "mcq" section => type="mcq"
- "very short" section => type="very_short"
- "short" section => type="short"
- "long" section => type="long"
- "case" section => type="case_study"

If section name unclear, infer from marks: 1 mark => mcq, 2 marks => very_short, 3-4 marks => short, 5+ marks => long.

OUTPUT FORMAT
- Return only valid JSON matching the schema.
- No markdown, prose, or comments.
- Every question must have ALL required fields.
- Never merge or skip questions.
- sub_questions: [] if no sub-questions, or array of question objects if compound.

ANTI-HALLUCINATION (STRICT)
- Never invent expected_steps count; extract from model or use null.
- Never invent key_concepts; extract only if named in model.
- Never invent final_answer; use null if not explicitly shown.
- Never change option values (always A/B/C/D, never option text).
- If uncertain about any field, use null or [].

${rubricStrictness === "strict" ? "STRICTNESS: When uncertain, choose conservative extraction. Never hallucinate. Preserve clarity." : "BALANCED: Use judgment to infer meaning while never inventing data."}
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
 * @param rubricNotes Optional additional rubric guidance.
 * @returns A prompt string instructing the model to produce structured exam JSON.
 */
export function buildStructurePrompt({ questionPaper, modelAnswers, rubricNotes }: BuildStructurePromptInput): string {
	return `
TASK: Extract structured exam metadata from question paper and model answers below.

QUESTION PAPER
${questionPaper}

---

MODEL ANSWERS
${modelAnswers}

---

FOR EACH QUESTION EXTRACT
1. question_id: unique identifier (e.g., Q1, 2a)
2. question_text: full question
3. question_format: "mcq" | "numerical" | "short" | "long"
4. question_type: "numerical" | "algebraic" | "proof" | "theory" | "mixed"
5. max_marks: number (if missing, guess and set marks_inferred=true)

FOR MCQ:
- options: ["A", "B", "C", "D"]
- final_answer: null
- expected_steps: []
- key_concepts: []

FOR NON-MCQ:
- options: []
- final_answer: extracted final result (or null)
- expected_steps: array with EXACTLY (max_marks) steps (or null if cannot extract exact count)
- key_concepts: [1-3 concept labels] or []

CRITICAL RULE
expected_steps COUNT MUST EQUAL max_marks:
- 2 marks => 2 steps
- 3 marks => 3 steps
- 4 marks => 4 steps
- 5 marks => 5 steps
- 6 marks => 6 steps
- 8 marks => 8 steps

If you cannot extract the exact number of steps required, use null (do NOT invent).

STEP EXAMPLES (for 3-mark question: Find common denominator, add fractions, verify answer)
1. "Find common denominator 8"
2. "Convert fractions: 3/4 = 6/8, then 6/8 + 5/8 = 11/8"
3. "State final answer: 11/8"

FIELD CONSTRAINTS
- options: MUST be ["A","B","C","D"] for MCQ; MUST be [] for non-MCQ
- final_answer: string or null (never []or object)
- expected_steps: string[] with exact count, or null
- key_concepts: string[] (1-3 labels), or []
- All other fields are required and must be present

${rubricNotes ? `ADDITIONAL NOTES\n${rubricNotes}\n` : ""}
Extract and return valid JSON only.
`;
}
