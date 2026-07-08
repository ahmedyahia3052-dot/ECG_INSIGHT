import type { ApiError } from "@/services/api";

export type HttpMethod = "DELETE" | "GET" | "HEAD" | "PATCH" | "POST" | "PUT";

export interface FoundationRequestOptions {
  accessToken?: string | null;
  body?: BodyInit | null;
  cancellationKey?: string;
  headers?: HeadersInit;
  method?: HttpMethod;
  retry?: boolean;
  signal?: AbortSignal | null;
  trackLoading?: boolean;
}

export interface FoundationRequestContext {
  correlationId: string;
  method: HttpMethod;
  path: string;
  startedAt: number;
}

export interface RepositoryContext {
  accessToken: string;
}

export type RepositoryResult<T> = Promise<T>;

export type FoundationError = ApiError;

export interface PaginatedQuery {
  page?: number;
  pageSize?: number;
  q?: string;
}
