import type { NextFunction, Request, Response } from "express";
import { BaseError } from "../error/base.error";

export const globalErrorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("ERROR:", err);

  if (err instanceof BaseError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Something went wrong",
  });
};
