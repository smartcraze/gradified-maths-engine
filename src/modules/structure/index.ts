import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import type { z } from "zod";
import { OPENROUTER_FREE_MODELS } from "@/config/constant";
import { env } from "@/config/env";
import {
  MODEL_ANSWER_STRUCTURE_SYSTEM_PROMPT,
  QUESTION_PAPER_STRUCTURE_SYSTEM_PROMPT,
  STUDENT_SHEET_STRUCTURE_SYSTEM_PROMPT,
} from "./prompt";
import {
  type StructuredModelAnswer,
  StructuredModelAnswerSchema,
  type StructuredQuestionPaper,
  StructuredQuestionPaperSchema,
  StructuredStudentSheetSchema,
} from "./schema";

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

type StructureAgentKind = "questionPaper" | "modelAnswer" | "studentSheet";

const STRUCTURE_AGENT_CONFIG = {
  questionPaper: {
    model: OPENROUTER_FREE_MODELS.questionPaper,
    system: QUESTION_PAPER_STRUCTURE_SYSTEM_PROMPT,
    schema: StructuredQuestionPaperSchema,
  },
  modelAnswer: {
    model: OPENROUTER_FREE_MODELS.modelAnswer,
    system: MODEL_ANSWER_STRUCTURE_SYSTEM_PROMPT,
    schema: StructuredModelAnswerSchema,
  },
  studentSheet: {
    model: OPENROUTER_FREE_MODELS.studentSheet,
    system: STUDENT_SHEET_STRUCTURE_SYSTEM_PROMPT,
    schema: StructuredStudentSheetSchema,
  },
} as const satisfies Record<
  StructureAgentKind,
  {
    model: string;
    system: string;
    schema: z.ZodTypeAny;
  }
>;

async function runStructureAgent<TSchema extends z.ZodTypeAny>(
  rawText: string,
  config: {
    model: string;
    system: string;
    schema: TSchema;
  },
): Promise<z.infer<TSchema>> {
  const { output } = await generateText({
    model: openrouter.chat(config.model),
    system: config.system,
    prompt: rawText,
    output: Output.object({
      schema: config.schema,
    }),
  });

  return output as z.infer<TSchema>;
}

export const structureQuestionPaper = (rawText: string) =>
  runStructureAgent(rawText, STRUCTURE_AGENT_CONFIG.questionPaper);

export const structureModelAnswer = (rawText: string) => runStructureAgent(rawText, STRUCTURE_AGENT_CONFIG.modelAnswer);

export const structureStudentSheet = (rawText: string) =>
  runStructureAgent(rawText, STRUCTURE_AGENT_CONFIG.studentSheet);

type StructureBatchInput = {
  questionPaperRaw: string;
  modelAnswerRaw: string;
};

type StructureAlignmentReport = {
  modelAnswerMissingRefs: string[];
};

function collectQuestionRefs(paper: StructuredQuestionPaper): Set<string> {
  const refs = new Set<string>();

  const walk = (questions: StructuredQuestionPaper["sections"][number]["questions"]) => {
    for (const question of questions) {
      if (question.questionNumber) {
        refs.add(question.questionNumber);
      }

      if (question.subQuestions?.length) {
        walk(question.subQuestions);
      }
    }
  };

  for (const section of paper.sections) {
    walk(section.questions);
  }

  return refs;
}

function buildAlignmentReport(
  questionPaper: StructuredQuestionPaper,
  modelAnswer: StructuredModelAnswer,
): StructureAlignmentReport {
  const refs = collectQuestionRefs(questionPaper);

  const modelAnswerMissingRefs = modelAnswer.answers
    .map((answer) => answer.questionRef)
    .filter((ref) => !refs.has(ref));

  return {
    modelAnswerMissingRefs,
  };
}

export async function structureAllDocumentsParallel(input: StructureBatchInput): Promise<{
  questionPaper: StructuredQuestionPaper;
  modelAnswer: StructuredModelAnswer;
  alignment: StructureAlignmentReport;
}> {
  const [questionPaper, modelAnswer] = await Promise.all([
    structureQuestionPaper(input.questionPaperRaw),
    structureModelAnswer(input.modelAnswerRaw),
  ]);

  return {
    questionPaper,
    modelAnswer,
    alignment: buildAlignmentReport(questionPaper, modelAnswer),
  };
}
