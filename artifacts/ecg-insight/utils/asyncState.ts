import type { AsyncStatus, QueryAsyncView } from "@/types/async-state";

function isNetworkError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("network") || message.includes("fetch") || message.includes("offline") || message.includes("timeout");
}

function isPermissionError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("403") || message.includes("forbidden") || message.includes("permission") || message.includes("unauthorized");
}

export function resolveAsyncStatus(input: {
  data?: unknown;
  emptyWhen?: (data: unknown) => boolean;
  error?: unknown;
  isError: boolean;
  isLoading: boolean;
}): AsyncStatus {
  if (input.isLoading) return "loading";
  if (input.isError) {
    if (isPermissionError(input.error)) return "permission-denied";
    if (isNetworkError(input.error)) return "network-error";
    return "error";
  }
  if (input.emptyWhen?.(input.data)) return "empty";
  if (input.data == null) return "empty";
  return "success";
}

export function toQueryAsyncView<T>(input: {
  data: T | undefined;
  emptyWhen?: (data: T | undefined) => boolean;
  error: unknown;
  isError: boolean;
  isLoading: boolean;
}): QueryAsyncView<T> {
  const error = input.error instanceof Error ? input.error : input.error ? new Error(String(input.error)) : null;
  const status = resolveAsyncStatus({
    data: input.data,
    emptyWhen: input.emptyWhen as (data: unknown) => boolean,
    error,
    isError: input.isError,
    isLoading: input.isLoading,
  });
  const empty = status === "empty" || Boolean(input.emptyWhen?.(input.data));

  return {
    data: input.data,
    empty,
    error,
    isError: input.isError,
    isLoading: input.isLoading,
    isNetworkError: status === "network-error",
    isPermissionDenied: status === "permission-denied",
    isSuccess: status === "success",
    status,
  };
}

export function greetingForHour(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function currentTimeLabel(date = new Date()) {
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
