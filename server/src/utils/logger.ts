import pino from "pino";

type LogLevel = "debug" | "info" | "warn" | "error";

const configuredLevel = (process.env["LOG_LEVEL"] as LogLevel | undefined) ?? "info";
const logger = pino({
  base: { service: "ecg-insight-api" },
  level: configuredLevel,
  messageKey: "message",
  timestamp: pino.stdTimeFunctions.isoTime,
});

function normalizeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return undefined;
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  );
}

export function log(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
  logger[level](normalizeMetadata(metadata) ?? {}, message);
}

export function logError(message: string, error: unknown, metadata?: Record<string, unknown>) {
  const normalizedError =
    error instanceof Error
      ? { errorMessage: error.message, errorName: error.name, stack: error.stack }
      : { errorMessage: String(error) };
  log("error", message, { ...metadata, ...normalizedError });
}

export function captureException(error: unknown, metadata?: Record<string, unknown>) {
  logError("Unhandled exception captured.", error, {
    exceptionMonitoringConfigured: Boolean(process.env["EXCEPTION_MONITORING_DSN"]),
    ...metadata,
  });
}
