import express, { type Request, type Response } from "express";
import helmet from "helmet";
import { globalErrorHandler } from "@/core/middleware/error.middleware";
import logger from "@/core/middleware/logger.middleware";

const app = express();

app.use(helmet());
app.use(logger);
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.send("OK");
});

app.use(globalErrorHandler);

export default app;
