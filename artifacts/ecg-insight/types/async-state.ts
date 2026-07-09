export type AsyncStatus =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "empty"
  | "permission-denied"
  | "network-error";

export type AsyncState<T> = {
  data: T | null;
  error: Error | null;
  status: AsyncStatus;
};

export type QueryAsyncView<T> = {
  data: T | undefined;
  empty: boolean;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  isNetworkError: boolean;
  isPermissionDenied: boolean;
  isSuccess: boolean;
  status: AsyncStatus;
};
