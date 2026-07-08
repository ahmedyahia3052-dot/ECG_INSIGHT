const RETRY_BASE_MS = Number(process.env.ECG_PROCESSING_RETRY_BASE_MS ?? 15_000);
const RETRY_MAX_MS = Number(process.env.ECG_PROCESSING_RETRY_MAX_MS ?? 300_000);

export function computeRetryDelayMs(attemptCount: number) {
  const exponential = RETRY_BASE_MS * 2 ** Math.max(0, attemptCount - 1);
  return Math.min(exponential, RETRY_MAX_MS);
}

export function scheduleRetryAt(attemptCount: number, from = Date.now()) {
  return new Date(from + computeRetryDelayMs(attemptCount));
}

export function isRecoverableProcessingError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("not found")) return false;
  if (message.includes("does not belong")) return false;
  if (message.includes("cancelled")) return false;
  if (message.includes("file format")) return false;
  return true;
}

export function processingErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/not found/i.test(message)) return "RESOURCE_NOT_FOUND";
  if (/digitiz|waveform|lead/i.test(message)) return "DIGITIZATION_FAILED";
  if (/quality|validation/i.test(message)) return "QUALITY_VALIDATION_FAILED";
  if (/persist|database|prisma/i.test(message)) return "PERSISTENCE_FAILED";
  return "PROCESSING_FAILED";
}
