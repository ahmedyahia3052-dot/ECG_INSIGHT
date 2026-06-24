type LogLevel = "debug" | "info" | "warn" | "error";

const severity: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel = (process.env["LOG_LEVEL"] as LogLevel | undefined) ?? "info";

function shouldLog(level: LogLevel) {
  return severity[level] >= severity[configuredLevel];
}

function normalizeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return undefined;
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  );
}

export function log(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const payload = {
    level,
    message,
    service: "ecg-insight-api",
    timestamp: new Date().toISOString(),
    ...normalizeMetadata(metadata),
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
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
