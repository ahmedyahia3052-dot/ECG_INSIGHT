import type { NextFunction, Request, Response } from "express";

const blockedKeys = new Set(["__proto__", "constructor", "prototype"]);

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!value || typeof value !== "object") {
    return typeof value === "string" ? value.trim() : value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (blockedKeys.has(key)) continue;
    sanitized[key] = sanitizeValue(nestedValue);
  }
  return sanitized;
}

export function inputSanitizer(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") req.body = sanitizeValue(req.body);
  if (req.query && typeof req.query === "object") req.query = sanitizeValue(req.query) as Request["query"];
  next();
}
