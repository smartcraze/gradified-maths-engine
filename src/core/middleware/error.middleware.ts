import type { NextFunction, Request, Response } from "express";
import { BaseError } from "../error/base.error";
import { ApiResponse } from "../utils/api.response";

export const globalErrorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("ERROR:", err);

  if (err instanceof BaseError) {
    return res.status(err.statusCode).json(ApiResponse.error(err.message));
  }

  return res.status(500).json(ApiResponse.error("Something went wrong"));
};
