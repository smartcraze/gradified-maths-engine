import { type Request, type Response, Router } from "express";
import { asyncHandler } from "@/core/middleware/async.handler";
import { validate } from "@/core/middleware/validation.middleware";
import { ApiResponse } from "@/core/utils/api.response";
import { evaluatePaper } from "@/modules/engine";
import { paperEvaluationRequestSchema } from "@/types";

const paperEvaluationRouter = Router();

paperEvaluationRouter.post(
  "/paper",
  validate(paperEvaluationRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await evaluatePaper(req.body);
    res.status(200).json(ApiResponse.success("Paper evaluated successfully", result));
  }),
);

export default paperEvaluationRouter;
