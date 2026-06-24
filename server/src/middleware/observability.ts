import type { NextFunction, Request, Response } from "express";
import { log } from "../utils/logger";

const startedAt = new Date();
const metrics = {
  errors: 0,
  requests: 0,
  totalDurationMs: 0,
};

export function requestMetrics(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    metrics.requests += 1;
    metrics.totalDurationMs += duration;
    if (res.statusCode >= 500) metrics.errors += 1;
    log(
      res.statusCode >= 500 ? "error" : "info",
      "API request completed.",
      {
        durationMs: duration,
        method: req.method,
        path: req.path,
        requestId: req.requestId,
        statusCode: res.statusCode,
        type: "api_call",
        userAgent: req.get("user-agent"),
      },
    );
  });
  next();
}

export function metricsSnapshot() {
  return {
    averageDurationMs: metrics.requests ? Number((metrics.totalDurationMs / metrics.requests).toFixed(2)) : 0,
    errors: metrics.errors,
    requests: metrics.requests,
    startedAt: startedAt.toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  };
}
