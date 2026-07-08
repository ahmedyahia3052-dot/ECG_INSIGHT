import { foundationEnvironment } from "../config/environment";
import { isFeatureEnabled, FEATURE_FLAGS } from "../config/feature-flags";

export type EnterpriseLogLevel = "debug" | "info" | "warn" | "error";

export interface EnterpriseLogEntry {
  correlationId?: string;
  durationMs?: number;
  level: EnterpriseLogLevel;
  message: string;
  meta?: Record<string, unknown>;
  scope: string;
  timestamp: string;
}

type LogListener = (entry: EnterpriseLogEntry) => void;

const listeners = new Set<LogListener>();

function shouldLog(level: EnterpriseLogLevel): boolean {
  if (!isFeatureEnabled(FEATURE_FLAGS.enterpriseLogging) && !foundationEnvironment.enterpriseLoggingEnabled) {
    return level === "error" || level === "warn";
  }
  if (foundationEnvironment.isProduction && level === "debug") return false;
  return true;
}

function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (/token|password|secret|authorization/i.test(key)) {
      sanitized[key] = "[redacted]";
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}

function emit(entry: EnterpriseLogEntry) {
  if (!shouldLog(entry.level)) return;
  listeners.forEach((listener) => listener(entry));
  const payload = {
    correlationId: entry.correlationId,
    durationMs: entry.durationMs,
    meta: entry.meta,
    scope: entry.scope,
    timestamp: entry.timestamp,
  };
  if (entry.level === "error") {
    console.error(`[ECG:${entry.scope}] ${entry.message}`, payload);
    return;
  }
  if (entry.level === "warn") {
    console.warn(`[ECG:${entry.scope}] ${entry.message}`, payload);
    return;
  }
  if (entry.level === "debug") {
    console.debug(`[ECG:${entry.scope}] ${entry.message}`, payload);
    return;
  }
  console.info(`[ECG:${entry.scope}] ${entry.message}`, payload);
}

function write(scope: string, level: EnterpriseLogLevel, message: string, meta?: Record<string, unknown>) {
  emit({
    correlationId: typeof meta?.correlationId === "string" ? meta.correlationId : undefined,
    durationMs: typeof meta?.durationMs === "number" ? meta.durationMs : undefined,
    level,
    message,
    meta: sanitizeMeta(meta),
    scope,
    timestamp: new Date().toISOString(),
  });
}

export const enterpriseLogger = {
  debug(scope: string, message: string, meta?: Record<string, unknown>) {
    write(scope, "debug", message, meta);
  },
  error(scope: string, message: string, meta?: Record<string, unknown>) {
    write(scope, "error", message, meta);
  },
  info(scope: string, message: string, meta?: Record<string, unknown>) {
    write(scope, "info", message, meta);
  },
  subscribe(listener: LogListener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  warn(scope: string, message: string, meta?: Record<string, unknown>) {
    write(scope, "warn", message, meta);
  },
};

export function createCorrelationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
