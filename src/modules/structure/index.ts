import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import { env } from "@/config/env";
import { MODEL_ANSWER, QUESTIONS } from "./input";
import { STRUCTURE_PROMPT } from "./promt";

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

const structuredprompt = `
You are given a question paper and model answers.

Your job is to align and structure them into JSON.

-------------------------
INPUT FORMAT
-------------------------
Question Paper:
${QUESTIONS}

Model Answers:
${MODEL_ANSWER}

-------------------------
IMPORTANT
-------------------------
- Questions and answers correspond by numbering
- Do not mismatch answers
- Preserve hierarchy (sections, sub-questions)
- Use LaTeX for math expressions

Return only JSON.
`;

const { text } = await generateText({
  model: openrouter.chat("openai/gpt-oss-120b:free"),
  system: STRUCTURE_PROMPT,
  prompt: structuredprompt,
  output: Output.json(),
});

console.log(text);
