import { apiRequest } from "@/services/api";

import { assertProductionApiConfiguration, logFoundationError, offlineRequestError } from "./error-handler";
import { offlineDetector } from "./offline-detector";
import { requestCancellationRegistry } from "./cancellation";
import { withRetryStrategy } from "./retry-strategy";
import type { FoundationRequestOptions } from "./types";
import { trackApiLoading } from "../state/api-loading-store";

export async function executeFoundationRequest<T>(
  path: string,
  options: FoundationRequestOptions = {},
): Promise<T> {
  assertProductionApiConfiguration();

  if (offlineDetector.isOffline) {
    throw offlineRequestError();
  }

  const method = options.method ?? "GET";
  const signal =
    options.cancellationKey !== undefined
      ? requestCancellationRegistry.createSignal(options.cancellationKey)
      : options.signal ?? undefined;

  const request = () =>
    apiRequest<T>(path, {
      accessToken: options.accessToken,
      body: options.body,
      headers: options.headers,
      method,
      signal,
    });

  const run = async () => {
    try {
      if (options.retry === false) {
        return await request();
      }
      return await withRetryStrategy(request, { method });
    } catch (error) {
      logFoundationError("api-abstraction", error, { method, path });
      throw error;
    } finally {
      if (options.cancellationKey) {
        requestCancellationRegistry.dispose(options.cancellationKey);
      }
    }
  };

  if (options.trackLoading === false) {
    return run();
  }
  return trackApiLoading(run);
}

export { apiRequest };
