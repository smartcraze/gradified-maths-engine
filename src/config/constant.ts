export const APP_NAME = "Maths Engine";
export const APP_VERSION = "1.0.0";

export const OPENROUTER_FREE_MODELS = {
  questionPaper: "nvidia/nemotron-3-super-120b-a12b:free",
  modelAnswer: "google/gemma-3-27b-it:free",
  studentSheet: "openai/gpt-oss-120b:free",
} as const;

// Backward-compatible alias for older imports.
export const gemma = OPENROUTER_FREE_MODELS.questionPaper;

export const STRUCTURE_OUTPUT_PROMPT_VERSION = "v1";

export const STRUCTURE_OUTPUT_PROMPT = `Return only valid JSON matching the provided schema. Do not include markdown fences, explanations, or extra keys.`;

// Backward-compatible alias for older typo'd constant name.
export const STRUCTURE_OUTPUT_PROMT = STRUCTURE_OUTPUT_PROMPT;
