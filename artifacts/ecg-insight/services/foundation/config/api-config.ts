import { foundationEnvironment } from "./environment";

export interface ApiClientConfiguration {
  baseUrl: string;
  correlationHeader: string;
  credentials: "include" | "omit" | "same-origin";
  featureFlagHeader: string;
  retryBaseDelayMs: number;
  retryMaxAttempts: number;
  timeoutMs: number;
}

export const apiClientConfiguration: ApiClientConfiguration = {
  baseUrl: foundationEnvironment.apiBaseUrl,
  correlationHeader: "x-correlation-id",
  credentials: "include",
  featureFlagHeader: "x-feature-flags",
  retryBaseDelayMs: foundationEnvironment.requestRetryBaseDelayMs,
  retryMaxAttempts: foundationEnvironment.requestRetryMaxAttempts,
  timeoutMs: foundationEnvironment.requestTimeoutMs,
};

export function assertApiConfiguration() {
  const warning = foundationEnvironment.apiConfigurationWarning;
  if (warning) {
    return { ok: false as const, warning };
  }
  return { ok: true as const, source: foundationEnvironment.apiConfigurationSource };
}
