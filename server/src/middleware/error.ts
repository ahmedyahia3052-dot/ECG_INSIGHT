import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = "APP_ERROR",
  ) {
    super(message);
  }
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, `Route not found: ${req.method} ${req.path}`, "NOT_FOUND"));
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      errors: error.flatten(),
      message: "Invalid request payload.",
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      code: error.code,
      message: error.message,
    });
  }

  console.error(error);
  return res.status(500).json({
    code: "INTERNAL_SERVER_ERROR",
    message: "Unexpected server error.",
  });
}
