import type { Request, Response } from "express";
import type { ZodError } from "zod";
import { AppError } from "../../errors/app-error";
import type { ApiErrorBody } from "./types";

export function buildErrorBody(input: {
  code: string;
  errors?: unknown;
  message: string;
  requestId?: string;
}): ApiErrorBody {
  return {
    code: input.code,
    ...(input.errors !== undefined ? { errors: input.errors } : {}),
    message: input.message,
    ...(input.requestId ? { requestId: input.requestId } : {}),
    success: false,
  };
}

export function buildValidationErrorBody(error: ZodError, requestId?: string): ApiErrorBody {
  return buildErrorBody({
    code: "VALIDATION_ERROR",
    errors: error.flatten(),
    message: "Invalid request payload.",
    requestId,
  });
}

export function buildAppErrorBody(error: AppError, requestId?: string): ApiErrorBody {
  return buildErrorBody({
    code: error.code,
    message: error.message,
    requestId,
  });
}

export function sendError(res: Response, statusCode: number, body: ApiErrorBody) {
  return res.status(statusCode).json(body);
}

export function throwNotFound(message: string, code = "NOT_FOUND") {
  throw new AppError(404, message, code);
}

export function throwForbidden(message: string, code = "FORBIDDEN") {
  throw new AppError(403, message, code);
}

export function throwUnauthorized(message = "Authentication required.", code = "UNAUTHORIZED") {
  throw new AppError(401, message, code);
}

export function throwValidation(message: string, code = "VALIDATION_ERROR") {
  throw new AppError(400, message, code);
}

export function problemJsonHeaders() {
  return {
    "Content-Type": "application/problem+json",
  };
}

export function toProblemJson(body: ApiErrorBody, statusCode: number, req: Request) {
  return {
    detail: body.message,
    instance: req.originalUrl,
    status: statusCode,
    title: body.code,
    type: `https://ecg-insight.local/problems/${body.code.toLowerCase()}`,
    ...(body.requestId ? { requestId: body.requestId } : {}),
    ...(body.errors !== undefined ? { errors: body.errors } : {}),
  };
}
