import type { Request, Response } from "express";
import { ApiResponse } from "@/core/utils/api.response";
import { prepareExamStructure, structureStudentAnswer } from "./service";

export async function prepareExamStructureController(req: Request, res: Response) {
  const { examCode, questionPaperRaw, modelAnswerRaw } = req.body as {
    examCode?: string;
    questionPaperRaw?: string;
    modelAnswerRaw?: string;
  };

  if (!questionPaperRaw || !modelAnswerRaw) {
    return res.status(400).json(ApiResponse.error("questionPaperRaw and modelAnswerRaw are required"));
  }

  const result = await prepareExamStructure({
    examCode,
    questionPaperRaw,
    modelAnswerRaw,
  });

  return res.status(200).json(ApiResponse.success("Exam structure prepared", result));
}

export async function structureStudentAnswerController(req: Request, res: Response) {
  const { examId, studentIdentifier, studentName, studentSheetRaw } = req.body as {
    examId?: string;
    studentIdentifier?: string;
    studentName?: string;
    studentSheetRaw?: string;
  };

  if (!examId || !studentIdentifier || !studentSheetRaw) {
    return res.status(400).json(ApiResponse.error("examId, studentIdentifier, and studentSheetRaw are required"));
  }

  const result = await structureStudentAnswer({
    examId,
    studentIdentifier,
    studentName,
    studentSheetRaw,
  });

  return res.status(200).json(ApiResponse.success("Student sheet structured", result));
}
