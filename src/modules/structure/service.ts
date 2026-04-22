import type { Prisma } from "@/generated/prisma/client";
import { structureAllDocumentsParallel, structureStudentSheet } from "./index";
import { createStudentSubmission, findOrCreateExamCache, getExamCacheByHashes, getExamCacheById } from "./repository";

export type PrepareExamStructureInput = {
  examCode?: string;
  questionPaperRaw: string;
  modelAnswerRaw: string;
};

export type PrepareExamStructureResult = {
  source: "cache" | "fresh";
  examId: string;
  questionPaperHash: string;
  modelAnswerHash: string;
};

async function hashContent(content: string): Promise<string> {
  const encoded = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function prepareExamStructure(input: PrepareExamStructureInput): Promise<PrepareExamStructureResult> {
  const questionPaperHash = await hashContent(input.questionPaperRaw);
  const modelAnswerHash = await hashContent(input.modelAnswerRaw);

  const existing = await getExamCacheByHashes(questionPaperHash, modelAnswerHash);
  if (existing) {
    return {
      source: "cache",
      examId: existing.id,
      questionPaperHash,
      modelAnswerHash,
    };
  }

  const structured = await structureAllDocumentsParallel({
    questionPaperRaw: input.questionPaperRaw,
    modelAnswerRaw: input.modelAnswerRaw,
  });

  const saved = await findOrCreateExamCache({
    examCode: input.examCode,
    questionPaperHash,
    modelAnswerHash,
    questionPaperRaw: input.questionPaperRaw,
    modelAnswerRaw: input.modelAnswerRaw,
    structuredQuestionPaper: structured.questionPaper as Prisma.InputJsonValue,
    structuredModelAnswer: structured.modelAnswer as Prisma.InputJsonValue,
    alignmentReport: structured.alignment as Prisma.InputJsonValue,
  });

  return {
    source: "fresh",
    examId: saved.id,
    questionPaperHash,
    modelAnswerHash,
  };
}

export type StructureStudentAnswerInput = {
  examId: string;
  studentIdentifier: string;
  studentName?: string;
  studentSheetRaw: string;
};

export async function structureStudentAnswer(input: StructureStudentAnswerInput) {
  const exam = await getExamCacheById(input.examId);
  if (!exam) {
    throw new Error(`Exam cache not found for examId: ${input.examId}`);
  }

  const structuredStudentSheet = await structureStudentSheet(input.studentSheetRaw);
  const studentSheetHash = await hashContent(input.studentSheetRaw);

  const submission = await createStudentSubmission({
    examId: input.examId,
    studentIdentifier: input.studentIdentifier,
    studentName: input.studentName,
    studentSheetHash,
    studentSheetRaw: input.studentSheetRaw,
    structuredStudentSheet: structuredStudentSheet as Prisma.InputJsonValue,
  });

  return {
    exam,
    structuredStudentSheet,
    submission,
  };
}
