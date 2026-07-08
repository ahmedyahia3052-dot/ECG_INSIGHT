export const API_STANDARD_VERSION = "sprint72-v1";

export type ApiErrorBody = {
  code: string;
  errors?: unknown;
  message: string;
  requestId?: string;
  success: false;
};

export type ApiMeta = {
  engineVersion?: string;
  requestId?: string;
  timestamp?: string;
};

export type ApiSuccessBody<T> = {
  data: T;
  meta?: ApiMeta;
  success: true;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedData<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export type ApiPaginatedBody<T> = ApiSuccessBody<PaginatedData<T>>;

export type HttpMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

export type EndpointInventoryEntry = {
  auth?: "admin" | "authenticated" | "doctor" | "optional" | "public";
  description?: string;
  legacyPath?: string;
  method: HttpMethod;
  module: string;
  operationId: string;
  path: string;
  tag: string;
  version: "v1";
};
