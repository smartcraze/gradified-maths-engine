import { Router } from "express";
import { asyncHandler } from "@/core/middleware/async.handler";
import { evaluateSubmissionController } from "./controller";

const engineRouter = Router();

engineRouter.post("/evaluate", asyncHandler(evaluateSubmissionController));

export default engineRouter;
