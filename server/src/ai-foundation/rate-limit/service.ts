interface RateLimitBucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, RateLimitBucket>();

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 30;

export interface AiRateLimitConfig {
  maxRequests?: number;
  windowMs?: number;
}

export interface AiRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
}

function bucketKey(actorId: string, kind: string) {
  return `${actorId}:${kind}`;
}

export function checkAiRateLimit(
  actorId: string,
  kind: string,
  config: AiRateLimitConfig = {},
): AiRateLimitResult {
  const windowMs = config.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = config.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const key = bucketKey(actorId || "anonymous", kind);
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (existing.count >= maxRequests) {
    const resetAt = existing.windowStart + windowMs;
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterMs: Math.max(0, resetAt - now),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    resetAt: existing.windowStart + windowMs,
  };
}

export function resetAiRateLimits(): void {
  buckets.clear();
}
