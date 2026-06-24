import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { captureException, log } from "../utils/logger";

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
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof ZodError) {
    log("warn", "Request validation failed.", {
      method: req.method,
      path: req.path,
      requestId: req.requestId,
    });
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      errors: error.flatten(),
      message: "Invalid request payload.",
      requestId: req.requestId,
    });
  }

  if (error instanceof AppError) {
    log(error.statusCode >= 500 ? "error" : "warn", error.message, {
      code: error.code,
      method: req.method,
      path: req.path,
      requestId: req.requestId,
      statusCode: error.statusCode,
    });
    return res.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      requestId: req.requestId,
    });
  }

  captureException(error, {
    method: req.method,
    path: req.path,
    requestId: req.requestId,
  });
  return res.status(500).json({
    code: "INTERNAL_SERVER_ERROR",
    message: "Unexpected server error.",
    requestId: req.requestId,
  });
}
