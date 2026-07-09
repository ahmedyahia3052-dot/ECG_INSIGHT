import { normalizeUiError, type UiError } from "../errors/ui-error";

/** Standard UI loading states exposed by every adapter. */
export type UiLoadingState = "loading" | "empty" | "refreshing" | "skeleton" | "error" | "ready";

export type AdapterViewState<T> = {
  data: T | null;
  empty: boolean;
  error: UiError | null;
  loading: boolean;
  ready: boolean;
  refreshing: boolean;
  skeleton: boolean;
  state: UiLoadingState;
};

export function resolveUiLoadingState(input: {
  data: unknown;
  emptyWhen?: (data: unknown) => boolean;
  isError: boolean;
  isFetching?: boolean;
  isLoading: boolean;
}): UiLoadingState {
  if (input.isLoading && input.data == null) return "loading";
  if (input.isFetching && input.data != null) return "refreshing";
  if (input.isError) return "error";
  if (input.emptyWhen?.(input.data) || (input.data == null && !input.isLoading)) return "empty";
  if (input.isLoading) return "skeleton";
  return "ready";
}

export function toAdapterViewState<T>(input: {
  data: T | null | undefined;
  emptyWhen?: (data: T | null | undefined) => boolean;
  error: unknown;
  isError: boolean;
  isFetching?: boolean;
  isLoading: boolean;
}): AdapterViewState<T> {
  const normalizedError = input.isError ? normalizeUiError(input.error) : null;
  const data = input.data ?? null;
  const state = resolveUiLoadingState({
    data,
    emptyWhen: input.emptyWhen as (data: unknown) => boolean,
    isError: input.isError,
    isFetching: input.isFetching,
    isLoading: input.isLoading,
  });

  return {
    data,
    empty: state === "empty",
    error: normalizedError,
    loading: state === "loading" || state === "skeleton",
    ready: state === "ready",
    refreshing: state === "refreshing",
    skeleton: state === "skeleton",
    state,
  };
}
