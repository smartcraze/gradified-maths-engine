import { prisma } from "@/config/prisma";
import { EvaluationStatus, ExamStructureStatus, type Prisma, SubmissionParseStatus } from "@/generated/prisma/client";

export type FindOrCreateExamCacheInput = {
  examCode?: string;
  questionPaperHash: string;
  modelAnswerHash: string;
  questionPaperRaw?: string;
  modelAnswerRaw?: string;
  structuredQuestionPaper: Prisma.InputJsonValue;
  structuredModelAnswer: Prisma.InputJsonValue;
  alignmentReport?: Prisma.InputJsonValue;
};

export async function findOrCreateExamCache(input: FindOrCreateExamCacheInput) {
  return prisma.examCache.upsert({
    where: {
      questionPaperHash_modelAnswerHash: {
        questionPaperHash: input.questionPaperHash,
        modelAnswerHash: input.modelAnswerHash,
      },
    },
    update: {
      examCode: input.examCode,
      questionPaperRaw: input.questionPaperRaw,
      modelAnswerRaw: input.modelAnswerRaw,
      structuredQuestionPaper: input.structuredQuestionPaper,
      structuredModelAnswer: input.structuredModelAnswer,
      alignmentReport: input.alignmentReport,
      status: ExamStructureStatus.READY,
    },
    create: {
      examCode: input.examCode,
      questionPaperHash: input.questionPaperHash,
      modelAnswerHash: input.modelAnswerHash,
      questionPaperRaw: input.questionPaperRaw,
      modelAnswerRaw: input.modelAnswerRaw,
      structuredQuestionPaper: input.structuredQuestionPaper,
      structuredModelAnswer: input.structuredModelAnswer,
      alignmentReport: input.alignmentReport,
      status: ExamStructureStatus.READY,
    },
  });
}

export async function getExamCacheByHashes(questionPaperHash: string, modelAnswerHash: string) {
  return prisma.examCache.findUnique({
    where: {
      questionPaperHash_modelAnswerHash: {
        questionPaperHash,
        modelAnswerHash,
      },
    },
    include: {
      studentSubmissions: false,
    },
  });
}

export async function getExamCacheById(examId: string) {
  return prisma.examCache.findUnique({
    where: {
      id: examId,
    },
  });
}

export type CreateStudentSubmissionInput = {
  examId: string;
  studentIdentifier: string;
  studentName?: string;
  studentSheetHash: string;
  studentSheetRaw?: string;
  structuredStudentSheet: Prisma.InputJsonValue;
  parseStatus?: SubmissionParseStatus;
};

export async function createStudentSubmission(input: CreateStudentSubmissionInput) {
  return prisma.studentSubmission.upsert({
    where: {
      examId_studentIdentifier_studentSheetHash: {
        examId: input.examId,
        studentIdentifier: input.studentIdentifier,
        studentSheetHash: input.studentSheetHash,
      },
    },
    update: {
      studentName: input.studentName,
      studentSheetRaw: input.studentSheetRaw,
      structuredStudentSheet: input.structuredStudentSheet,
      parseStatus: input.parseStatus ?? SubmissionParseStatus.PARSED,
    },
    create: {
      examId: input.examId,
      studentIdentifier: input.studentIdentifier,
      studentName: input.studentName,
      studentSheetHash: input.studentSheetHash,
      studentSheetRaw: input.studentSheetRaw,
      structuredStudentSheet: input.structuredStudentSheet,
      parseStatus: input.parseStatus ?? SubmissionParseStatus.PARSED,
    },
  });
}

export type UpsertEvaluationResultInput = {
  submissionId: string;
  totalMarks?: string;
  maxMarks?: string;
  percentage?: string;
  questionWiseMarks?: Prisma.InputJsonValue;
  rubricBreakdown?: Prisma.InputJsonValue;
  feedback?: Prisma.InputJsonValue;
  status?: EvaluationStatus;
};

export async function upsertEvaluationResult(input: UpsertEvaluationResultInput) {
  return prisma.evaluationResult.upsert({
    where: {
      submissionId: input.submissionId,
    },
    update: {
      totalMarks: input.totalMarks,
      maxMarks: input.maxMarks,
      percentage: input.percentage,
      questionWiseMarks: input.questionWiseMarks,
      rubricBreakdown: input.rubricBreakdown,
      feedback: input.feedback,
      status: input.status ?? EvaluationStatus.COMPLETED,
    },
    create: {
      submissionId: input.submissionId,
      totalMarks: input.totalMarks,
      maxMarks: input.maxMarks,
      percentage: input.percentage,
      questionWiseMarks: input.questionWiseMarks,
      rubricBreakdown: input.rubricBreakdown,
      feedback: input.feedback,
      status: input.status ?? EvaluationStatus.COMPLETED,
    },
  });
}
