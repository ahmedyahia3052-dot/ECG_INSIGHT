const RETRY_BASE_MS = Number(process.env.ECG_INGESTION_RETRY_BASE_MS ?? 20_000);
const RETRY_MAX_MS = Number(process.env.ECG_INGESTION_RETRY_MAX_MS ?? 600_000);
const DEFAULT_TIMEOUT_MS = Number(process.env.ECG_INGESTION_DEFAULT_TIMEOUT_MS ?? 600_000);
const DUPLICATE_WINDOW_HOURS = Number(process.env.ECG_INGESTION_DUPLICATE_WINDOW_HOURS ?? 24);

export function getDefaultIngestionTimeoutMs() {
  return DEFAULT_TIMEOUT_MS;
}

export function getDuplicateDetectionWindowMs() {
  return DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000;
}

export function computeIngestionRetryDelayMs(attemptCount: number) {
  const exponential = RETRY_BASE_MS * 2 ** Math.max(0, attemptCount - 1);
  return Math.min(exponential, RETRY_MAX_MS);
}

export function scheduleIngestionRetryAt(attemptCount: number, from = Date.now()) {
  return new Date(from + computeIngestionRetryDelayMs(attemptCount));
}

export function isRecoverableIngestionError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("not found")) return false;
  if (message.includes("does not belong")) return false;
  if (message.includes("cancelled")) return false;
  if (message.includes("duplicate")) return false;
  if (message.includes("unsupported")) return false;
  if (message.includes("timed out")) return true;
  if (message.includes("rate limit")) return true;
  if (message.includes("provider unavailable")) return true;
  if (message.includes("connection")) return true;
  return true;
}

export function ingestionErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/timed out/i.test(message)) return "PIPELINE_TIMEOUT";
  if (/duplicate/i.test(message)) return "DUPLICATE_INGESTION";
  if (/not found/i.test(message)) return "RESOURCE_NOT_FOUND";
  if (/checksum/i.test(message)) return "CHECKSUM_FAILED";
  if (/storage/i.test(message)) return "STORAGE_FAILED";
  if (/validation/i.test(message)) return "VALIDATION_FAILED";
  if (/persist|database|prisma/i.test(message)) return "PERSISTENCE_FAILED";
  return "INGESTION_FAILED";
}

export class IngestionTimeoutError extends Error {
  readonly code = "PIPELINE_TIMEOUT";

  constructor(timeoutMs: number) {
    super(`ECG ingestion pipeline timed out after ${timeoutMs}ms.`);
    this.name = "IngestionTimeoutError";
  }
}

export function hasIngestionTimedOut(startedAt: Date | null | undefined, timeoutMs: number, now = Date.now()) {
  if (!startedAt) return false;
  return now - startedAt.getTime() > timeoutMs;
}

export function withIngestionTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new IngestionTimeoutError(timeoutMs)), timeoutMs);
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
