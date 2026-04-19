import { z } from "zod";

export const questionTypeSchema = z.enum(["algebra", "calculus", "proof", "mcq"]);

export type QuestionType = z.infer<typeof questionTypeSchema>;

export const routingInputSchema = z.object({
  paperId: z.string().min(1),
  questionId: z.string().min(1),
  questionLatex: z.string().min(1),
  studentAnswerLatex: z.string().default(""),
  maxMarks: z.number().positive(),
  questionType: questionTypeSchema.optional(),
});

export type RoutingInput = z.infer<typeof routingInputSchema>;

export const questionRoutingSchema = z.object({
  questionType: questionTypeSchema,
  confidence: z.enum(["high", "medium", "low"]),
  rationale: z.string().min(1),
});

export type QuestionRoutingResult = z.infer<typeof questionRoutingSchema>;

export interface EngineRoutingResult {
  paperId: string;
  questionId: string;
  questionType: QuestionType;
  confidence: QuestionRoutingResult["confidence"];
  rationale: string;
  usedFallback: boolean;
  routerModel: string;
  // Placeholder for future rubric loading and judging stages.
  nextStage: "rubric-loading";
}
