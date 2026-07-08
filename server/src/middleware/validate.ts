import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

export function validateBody<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}

export function validateQuery<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.query = schema.parse(req.query) as Request["query"];
    next();
  };
}
