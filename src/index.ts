import express, { type Request, type Response } from "express";
import helmet from "helmet";
import { globalErrorHandler } from "@/core/middleware/error.middleware";
import logger from "@/core/middleware/logger.middleware";
import { ApiResponse } from "@/core/utils/api.response";
import learningRoutes from "@/modules/learning/route";

const app = express();

app.use(helmet());
app.use(logger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req: Request, res: Response) => {
	res.status(200).json(ApiResponse.success("OK", { status: "healthy" }));
});

app.use("/learning", learningRoutes);

app.use(globalErrorHandler);

export default app;
