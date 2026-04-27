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
- question_id: string (MUST be the question number as string: "1", "2", "3", etc. - matching question paper)
- question_text: string (full question)
- question_format: "mcq" | "numerical" | "short" | "long"
- question_type: "numerical" | "algebraic" | "proof" | "theory" | "mixed"
- options: actual option texts ["...", "...", "...", "..."] for MCQ (must match A→B→C→D order), [] for non-MCQ
- model_answer: string (complete model solution)
- max_marks: number (required; use marks_inferred=true if guessed)
- marks_inferred: boolean (true only if max_marks was guessed)
- final_answer: string or null (extracted final result from model, or null if N/A)
- expected_steps: string[] (${preferStepExtraction ? "MUST match step count for max_marks, or null if cannot extract" : "[] if extraction not preferred"})
- key_concepts: string[] (1-3 concept labels, or [] if none)
- sub_questions: question[] (nested structure for compound questions)

MCQ FIELD VALUES
For MCQ questions (question_format="mcq"):
- options: ["text of A", "text of B", "text of C", "text of D"] (MUST extract actual option text from question paper)
- model_answer: "(a) option_text" or just "(b)" format showing correct option letter
- final_answer: the text of the correct option (e.g., "8" if answer is (b) 8)
- expected_steps: [] (empty, MCQ is binary)
- key_concepts: [] (empty)

EXAMPLE MCQ EXTRACTION:
Question: "1. If A = {1, 2, 3}, then number of subsets of A is:\n(a) 6 (b) 8 (c) 9 (d) 3"
Model Answer: "1. (b) 8"

Extract as:
- question_id: "1"  (MUST match the question number in paper, not "Q1")
- options: ["6", "8", "9", "3"]  (ACTUAL option texts in order A→B→C→D)
- model_answer: "(b)"  (the correct option letter from model answer)
- final_answer: "8"  (the text of the correct option)

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

CRITICAL: question_id MUST be just the question number as a string ("1", "2", "3", etc.)
- Do NOT use "Q1", "2a", or section prefixes
- Must match the student answer sheet question numbers exactly

FOR MCQ QUESTIONS
- question_format: "mcq"
- question_id: "1", "2", "3", etc.
- options: ["text of option A", "text of option B", "text of option C", "text of option D"]
  EXAMPLE: For "Number of subsets: (a) 6 (b) 8 (c) 9 (d) 3", options: ["6", "8", "9", "3"]
- model_answer: just the letter like "(a)" or "(b)"
- final_answer: the text of the correct option (e.g., "8" if (b) is correct)
- expected_steps: [] (empty for MCQ)
- key_concepts: [] (empty for MCQ)

FOR NON-MCQ QUESTIONS
- options: [] (empty array)
- final_answer: extracted final result or null
- expected_steps: string[] with EXACTLY (max_marks) strings, or null if cannot extract exact count
- key_concepts: [1-3 labels] or []

EXPECTED_STEPS COUNT RULE (CRITICAL)
Count must equal max_marks:
- 2 marks => 2 steps
- 3 marks => 3 steps
- etc.

If exact count cannot be extracted, use null (do NOT invent).

${rubricNotes ? `RUBRIC NOTES:\n${rubricNotes}\n` : ""}
Return ONLY valid JSON matching the system prompt schema. No explanations or comments.
`;
}
