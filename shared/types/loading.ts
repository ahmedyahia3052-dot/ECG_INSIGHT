/** Standardized loading / empty / offline contracts for all UI adapters and hooks. */
export type LoadingStatus =
  | "loading"
  | "success"
  | "empty"
  | "error"
  | "offline"
  | "retry"
  | "unauthorized";

export type LoadingContract<TData> = {
  data?: TData;
  empty: boolean;
  errorMessage?: string;
  offline: boolean;
  retryable: boolean;
  status: LoadingStatus;
  unauthorized: boolean;
};

export function resolveLoadingContract<TData>(input: {
  data?: TData;
  emptyWhen?: (data: TData | undefined) => boolean;
  error?: unknown;
  isError: boolean;
  isLoading: boolean;
  isOffline?: boolean;
  isUnauthorized?: boolean;
}): LoadingContract<TData> {
  if (input.isLoading) {
    return { empty: false, offline: false, retryable: false, status: "loading", unauthorized: false };
  }
  if (input.isOffline) {
    return { empty: false, offline: true, retryable: true, status: "offline", unauthorized: false, errorMessage: "Network offline." };
  }
  if (input.isUnauthorized) {
    return { empty: false, offline: false, retryable: false, status: "unauthorized", unauthorized: true, errorMessage: "Session expired or unauthorized." };
  }
  if (input.isError) {
    const message = input.error instanceof Error ? input.error.message : "Request failed.";
    return { empty: false, offline: false, retryable: true, status: "retry", unauthorized: false, errorMessage: message };
  }
  const empty = input.emptyWhen?.(input.data) ?? (input.data == null || (Array.isArray(input.data) && input.data.length === 0));
  if (empty) {
    return { data: input.data, empty: true, offline: false, retryable: false, status: "empty", unauthorized: false };
  }
  return { data: input.data, empty: false, offline: false, retryable: false, status: "success", unauthorized: false };
}
