/**
 * Sprint 84 — Shared list query parsing (pagination, search, sort).
 */

import { z } from "zod";

export const listQuerySchema = z.object({
  includeDeleted: z.coerce.boolean().optional().default(false),
  organizationId: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  q: z.string().trim().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export function paginatedResult<T>(items: T[], total: number, page: number, pageSize: number) {
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function apiSuccess<T>(data: T, meta?: Record<string, unknown>) {
  return { data, meta, success: true as const };
}

export function resolveOrderBy<T extends string>(
  sortBy: string | undefined,
  sortDir: "asc" | "desc",
  allowed: Record<string, unknown>,
  fallback: unknown,
) {
  if (sortBy && sortBy in allowed) {
    return allowed[sortBy];
  }
  return fallback;
}

export function searchOrClauses(fields: Array<Record<string, unknown>>, q?: string) {
  if (!q) return undefined;
  return fields.map((field) => field);
}
