import { ApiError } from "@/services/api";
import { normalizeClinicalError, type ClinicalError } from "@/utils/clinicalErrors";

import { foundationEnvironment } from "../config/environment";
import { enterpriseLogger } from "../logging/enterprise-logger";

export interface FoundationApiErrorDetails extends ClinicalError {
  status: number;
}

export function mapFoundationError(error: unknown): FoundationApiErrorDetails {
  if (error instanceof ApiError) {
    const clinical = normalizeClinicalError(error);
    return {
      ...clinical,
      code: error.code ?? clinical.code,
      message: error.message || clinical.message,
      status: error.status,
    };
  }
  const clinical = normalizeClinicalError(error);
  return {
    ...clinical,
    status: 0,
  };
}

export function isRetryableFoundationError(error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.status === 429) return true;
    if (error.status >= 500) return true;
    if (error.status === 0) return true;
    if (error.code === "BACKEND_UNAVAILABLE" || error.code === "SERVER_TIMEOUT") return true;
    return false;
  }
  return mapFoundationError(error).retryable;
}

export function logFoundationError(scope: string, error: unknown, meta?: Record<string, unknown>) {
  const mapped = mapFoundationError(error);
  enterpriseLogger.error(scope, mapped.message, {
    ...meta,
    code: mapped.code,
    retryable: mapped.retryable,
    status: mapped.status,
  });
}

export function offlineRequestError(): ApiError {
  return new ApiError(
    "You appear to be offline. Reconnect and try again.",
    0,
    "NETWORK_OFFLINE",
  );
}

export function configurationRequestError(message: string): ApiError {
  return new ApiError(message, 503, "API_CONFIGURATION_ERROR");
}

export function assertProductionApiConfiguration() {
  const warning = foundationEnvironment.apiConfigurationWarning;
  if (warning && foundationEnvironment.isProduction) {
    throw configurationRequestError(warning);
  }
}
