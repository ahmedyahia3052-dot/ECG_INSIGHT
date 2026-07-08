import type { Response } from "express";
import type { ApiMeta, ApiPaginatedBody, ApiSuccessBody, PaginatedData, PaginationMeta } from "./types";
import { API_STANDARD_VERSION } from "./types";

export function buildMeta(requestId?: string, extra?: Omit<ApiMeta, "requestId">): ApiMeta {
  return {
    engineVersion: API_STANDARD_VERSION,
    requestId,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

export function buildPaginationMeta(input: {
  page: number;
  pageSize: number;
  total: number;
}): PaginationMeta {
  return {
    page: input.page,
    pageSize: input.pageSize,
    total: input.total,
    totalPages: Math.max(1, Math.ceil(input.total / input.pageSize)),
  };
}

export function successBody<T>(data: T, meta?: ApiMeta): ApiSuccessBody<T> {
  return {
    data,
    ...(meta ? { meta } : {}),
    success: true,
  };
}

export function paginatedBody<T>(items: T[], pagination: PaginationMeta, meta?: ApiMeta): ApiPaginatedBody<T> {
  return successBody<PaginatedData<T>>({ items, pagination }, meta);
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: ApiMeta) {
  return res.status(statusCode).json(successBody(data, meta));
}

export function sendCreated<T>(res: Response, data: T, meta?: ApiMeta) {
  return sendSuccess(res, data, 201, meta);
}

export function sendPaginated<T>(
  res: Response,
  items: T[],
  pagination: PaginationMeta,
  meta?: ApiMeta,
) {
  return res.status(200).json(paginatedBody(items, pagination, meta));
}

/** Legacy-compatible list envelope used by existing list endpoints during migration. */
export function legacyListEnvelope<TKey extends string, TItem>(
  key: TKey,
  items: TItem[],
  pagination: PaginationMeta,
) {
  return {
    [key]: items,
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    totalPages: pagination.totalPages,
  } as Record<TKey, TItem[]> & PaginationMeta;
}
