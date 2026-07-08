import type { Request } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";

function isLocalAutomationRequest(req: Request) {
  if (env.NODE_ENV !== "development") return false;
  const ip = req.ip ?? "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1" || ip.endsWith("127.0.0.1");
}

export const authRateLimitMiddleware = rateLimit({
  legacyHeaders: false,
  limit: env.AUTH_RATE_LIMIT_MAX,
  message: {
    code: "AUTH_RATE_LIMITED",
    message: "Too many authentication attempts. Try again later.",
  },
  skip: isLocalAutomationRequest,
  standardHeaders: "draft-8",
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
});
