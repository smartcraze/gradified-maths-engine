import express, { type Request, type Response } from "express";
import fs from "fs/promises";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import { globalErrorHandler } from "@/core/middleware/error.middleware";
import logger from "@/core/middleware/logger.middleware";
import { ApiResponse } from "@/core/utils/api.response";
import apiRoutes from "@/modules/api";
import olmOcrRoutes from "@/modules/olm-ocr/route";

const app = express();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");
const logsDir = path.join(projectRoot, "logs");

app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "'unsafe-inline'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				imgSrc: ["'self'", "data:", "https:"],
				connectSrc: ["'self'"],
			},
		},
	}),
);
app.use(logger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/", express.static(publicDir));
app.use("/logs", express.static(logsDir));

app.get("/health", (_req: Request, res: Response) => {
	res.status(200).json(ApiResponse.success("OK", { status: "healthy" }));
});

app.get("/logs/index.json", async (_req: Request, res: Response) => {
	try {
		const files = await fs.readdir(logsDir);
		const filtered = files.filter((file) => file.startsWith("m00") && file.endsWith(".json"));
		res.status(200).json(filtered);
	} catch (error) {
		console.error("Failed to read logs directory", error);
		res.status(500).json(ApiResponse.error("Failed to read logs"));
	}
});

app.use("/api", apiRoutes);
app.use("/api/olm-ocr", olmOcrRoutes);

app.use(globalErrorHandler);

export default app;
