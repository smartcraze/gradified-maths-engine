import express, { type Request, type Response } from "express";
import helmet from "helmet";
import { globalErrorHandler } from "@/core/middleware/error.middleware";
import logger from "@/core/middleware/logger.middleware";
import { ApiResponse } from "@/core/utils/api.response";
import learningRoutes from "@/modules/learning/route";
import { db } from "./config/db";
import { ocrRequests } from "./db/schema";

const app = express();

const [ocr] = await db
	.insert(ocrRequests)
	.values({
		file_name: "maths.pdf",
		mime_type: "application/pdf",
		size_bytes: 1024,
		request_id: "test-123",
	})
	.returning();

console.log("Inserted OCR Request:", ocr);

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
