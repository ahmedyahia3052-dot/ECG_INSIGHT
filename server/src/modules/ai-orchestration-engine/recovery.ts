const RETRY_BASE_MS = Number(process.env.AI_ORCHESTRATION_RETRY_BASE_MS ?? 20_000);
const RETRY_MAX_MS = Number(process.env.AI_ORCHESTRATION_RETRY_MAX_MS ?? 600_000);
const DEFAULT_TIMEOUT_MS = Number(process.env.AI_ORCHESTRATION_DEFAULT_TIMEOUT_MS ?? 300_000);

export function getDefaultOrchestrationTimeoutMs() {
  return DEFAULT_TIMEOUT_MS;
}

export function computeOrchestrationRetryDelayMs(attemptCount: number) {
  const exponential = RETRY_BASE_MS * 2 ** Math.max(0, attemptCount - 1);
  return Math.min(exponential, RETRY_MAX_MS);
}

export function scheduleOrchestrationRetryAt(attemptCount: number, from = Date.now()) {
  return new Date(from + computeOrchestrationRetryDelayMs(attemptCount));
}

export function isRecoverableOrchestrationError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("not found")) return false;
  if (message.includes("does not belong")) return false;
  if (message.includes("cancelled")) return false;
  if (message.includes("cannot accept analysis")) return false;
  if (message.includes("timed out")) return true;
  if (message.includes("rate limit")) return true;
  if (message.includes("provider unavailable")) return true;
  return true;
}

export function orchestrationErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/timed out/i.test(message)) return "PIPELINE_TIMEOUT";
  if (/not found/i.test(message)) return "RESOURCE_NOT_FOUND";
  if (/rate limit/i.test(message)) return "AI_RATE_LIMITED";
  if (/provider|ollama|openai/i.test(message)) return "PROVIDER_UNAVAILABLE";
  if (/validation/i.test(message)) return "VALIDATION_FAILED";
  if (/persist|database|prisma/i.test(message)) return "PERSISTENCE_FAILED";
  return "ORCHESTRATION_FAILED";
}

export class OrchestrationTimeoutError extends Error {
  readonly code = "PIPELINE_TIMEOUT";

  constructor(timeoutMs: number) {
    super(`AI orchestration pipeline timed out after ${timeoutMs}ms.`);
    this.name = "OrchestrationTimeoutError";
  }
}

export function withOrchestrationTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new OrchestrationTimeoutError(timeoutMs)), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
