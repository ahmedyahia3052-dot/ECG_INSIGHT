import { apiClientConfiguration } from "../config/api-config";
import { isFeatureEnabled, FEATURE_FLAGS } from "../config/feature-flags";
import { isRetryableFoundationError } from "./error-handler";

export interface RetryStrategyOptions {
  baseDelayMs?: number;
  maxAttempts?: number;
  method?: string;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

function defaultShouldRetry(error: unknown, attempt: number, maxAttempts: number, method?: string) {
  if (attempt >= maxAttempts) return false;
  if (!isFeatureEnabled(FEATURE_FLAGS.requestRetry)) return false;
  const normalizedMethod = (method ?? "GET").toUpperCase();
  if (normalizedMethod !== "GET" && normalizedMethod !== "HEAD") return false;
  return isRetryableFoundationError(error);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function withRetryStrategy<T>(
  operation: () => Promise<T>,
  options: RetryStrategyOptions = {},
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? apiClientConfiguration.retryMaxAttempts);
  const baseDelayMs = options.baseDelayMs ?? apiClientConfiguration.retryBaseDelayMs;

  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;
      const shouldRetry =
        options.shouldRetry?.(error, attempt) ??
        defaultShouldRetry(error, attempt, maxAttempts, options.method);
      if (!shouldRetry) throw error;
      const backoff = baseDelayMs * 2 ** (attempt - 1);
      await delay(backoff);
    }
  }
}
