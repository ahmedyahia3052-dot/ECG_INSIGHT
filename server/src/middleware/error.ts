import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { buildAppErrorBody, buildErrorBody, buildValidationErrorBody, toProblemJson } from "../api/standards/errors";
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
    const body = buildValidationErrorBody(error, req.requestId);
    if (req.accepts("application/problem+json")) {
      return res.status(400).set("Content-Type", "application/problem+json").json(toProblemJson(body, 400, req));
    }
    return res.status(400).json(body);
  }

  if (error instanceof AppError) {
    log(error.statusCode >= 500 ? "error" : "warn", error.message, {
      code: error.code,
      method: req.method,
      path: req.path,
      requestId: req.requestId,
      statusCode: error.statusCode,
    });
    const body = buildAppErrorBody(error, req.requestId);
    if (req.accepts("application/problem+json")) {
      return res.status(error.statusCode).set("Content-Type", "application/problem+json").json(toProblemJson(body, error.statusCode, req));
    }
    return res.status(error.statusCode).json(body);
  }

  captureException(error, {
    method: req.method,
    path: req.path,
    requestId: req.requestId,
  });
  const body = buildErrorBody({
    code: "INTERNAL_SERVER_ERROR",
    message: "Unexpected server error.",
    requestId: req.requestId,
  });
  if (req.accepts("application/problem+json")) {
    return res.status(500).set("Content-Type", "application/problem+json").json(toProblemJson(body, 500, req));
  }
  return res.status(500).json(body);
}
