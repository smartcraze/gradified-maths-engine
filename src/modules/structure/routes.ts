import { Router } from "express";
import { asyncHandler } from "@/core/middleware/async.handler";
import { prepareExamStructureController, structureStudentAnswerController } from "./controller";

const structureRouter = Router();

structureRouter.post("/exam/prepare", asyncHandler(prepareExamStructureController));
structureRouter.post("/student/submit", asyncHandler(structureStudentAnswerController));

export default structureRouter;
