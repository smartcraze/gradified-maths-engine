import express, { type Request, type Response } from "express";
import helmet from "helmet";
import { globalErrorHandler } from "@/core/middleware/error.middleware";
import logger from "@/core/middleware/logger.middleware";
import { ApiResponse } from "@/core/utils/api.response";
import gradingRoutes from "@/modules/grading/route";
import learningRoutes from "@/modules/learning/route";
import ocrRoutes from "@/modules/ocr/route";
import structureRoutes from "@/modules/structure/route";

const app = express();

app.use(helmet());
app.use(logger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req: Request, res: Response) => {
	res.status(200).json(ApiResponse.success("OK", { status: "healthy" }));
});

app.use("/structure", structureRoutes);
app.use("/grading", gradingRoutes);
app.use("/learning", learningRoutes);
app.use("/ocr", ocrRoutes);

app.use(globalErrorHandler);

export default app;
