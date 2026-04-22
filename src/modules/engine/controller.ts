import type { Request, Response } from "express";
import { ApiResponse } from "@/core/utils/api.response";
import { evaluateSubmission } from "./service";

export async function evaluateSubmissionController(req: Request, res: Response) {
  const { submissionId, forceRegrade } = req.body as {
    submissionId?: string;
    forceRegrade?: boolean;
  };

  if (!submissionId) {
    return res.status(400).json(ApiResponse.error("submissionId is required"));
  }

  const result = await evaluateSubmission({
    submissionId,
    forceRegrade,
  });

  return res.status(200).json(ApiResponse.success("Submission evaluated", result));
}
