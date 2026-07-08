import type { AxiosError, InternalAxiosRequestConfig } from "axios";

import { apiClient, normalizeApiError } from "@/services/api";

import { apiClientConfiguration } from "../config/api-config";
import { serializeFeatureFlagsHeader } from "../config/feature-flags";
import { createCorrelationId, enterpriseLogger } from "../logging/enterprise-logger";
import { useApiLoadingStore } from "../state/api-loading-store";
import { offlineRequestError } from "./error-handler";
import { offlineDetector } from "./offline-detector";

type InstrumentedAxiosConfig = InternalAxiosRequestConfig & {
  __correlationId?: string;
  __startedAt?: number;
};

let interceptorsRegistered = false;

function attachMetadata(config: InstrumentedAxiosConfig) {
  const correlationId = createCorrelationId();
  config.__correlationId = correlationId;
  config.__startedAt = Date.now();
  config.headers.set(apiClientConfiguration.correlationHeader, correlationId);
  const featureFlags = serializeFeatureFlagsHeader();
  if (featureFlags) {
    config.headers.set(apiClientConfiguration.featureFlagHeader, featureFlags);
  }
  return config;
}

export function registerEnterpriseInterceptors() {
  if (interceptorsRegistered) return;
  interceptorsRegistered = true;

  apiClient.interceptors.request.use(
    (config) => {
      if (offlineDetector.isOffline) {
        return Promise.reject(offlineRequestError());
      }
      const instrumented = attachMetadata(config as InstrumentedAxiosConfig);
      useApiLoadingStore.getState().increment();
      enterpriseLogger.debug("api-interceptor", "Outgoing request", {
        correlationId: instrumented.__correlationId,
        method: instrumented.method?.toUpperCase(),
        url: instrumented.url,
      });
      return instrumented;
    },
    (error) => Promise.reject(normalizeApiError(error)),
  );

  apiClient.interceptors.response.use(
    (response) => {
      useApiLoadingStore.getState().decrement();
      const config = response.config as InstrumentedAxiosConfig;
      const durationMs =
        config.__startedAt !== undefined ? Date.now() - config.__startedAt : undefined;
      enterpriseLogger.info("api-interceptor", "Request completed", {
        correlationId: config.__correlationId,
        durationMs,
        status: response.status,
        url: config.url,
      });
      return response;
    },
    (error: AxiosError) => {
      useApiLoadingStore.getState().decrement();
      const config = error.config as InstrumentedAxiosConfig | undefined;
      const durationMs =
        config?.__startedAt !== undefined ? Date.now() - config.__startedAt : undefined;
      enterpriseLogger.warn("api-interceptor", "Request failed", {
        correlationId: config?.__correlationId,
        durationMs,
        status: error.response?.status ?? 0,
        url: config?.url,
      });
      return Promise.reject(error);
    },
  );
}
