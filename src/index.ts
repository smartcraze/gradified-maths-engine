import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { env } from "@/config/env";
import { globalErrorHandler } from "@/core/middleware/error.middleware";
import logger from "@/core/middleware/logger.middleware";

const app = express();

app.use(helmet());
app.use(express.json());
app.use((_req: Request, _res: Response, next: NextFunction) => {
  logger.info("Request received");
  next();
});

app.get("/health", (_req: Request, res: Response) => {
  res.send("OK");
});

app.use(globalErrorHandler);

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});
