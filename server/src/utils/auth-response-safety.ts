import { isProduction } from "../config/env";

const sensitiveAuthFields = ["resetToken", "emailVerificationToken", "otp"] as const;

export function exposeAuthTokensInResponse() {
  return !isProduction;
}

export function redactAuthSecrets<T extends Record<string, unknown>>(payload: T): T {
  if (exposeAuthTokensInResponse()) return payload;
  const sanitized = { ...payload };
  for (const field of sensitiveAuthFields) {
    if (field in sanitized) {
      delete sanitized[field];
    }
  }
  return sanitized;
}
