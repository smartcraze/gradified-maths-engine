import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";
import { ApiResponse } from "../utils/api.response";

export const validate = (schema: z.ZodSchema<unknown>) => (req: Request, res: Response, next: NextFunction) => {
	const result = schema.safeParse(req.body);

	if (!result.success) {
		return res.status(400).json(ApiResponse.error("Validation failed", result.error.issues));
	}

	req.body = result.data;
	next();
};
