/**
 * Sprint 80 — Soft-delete query helpers for Prisma repositories.
 */

import type { DatabaseEntityId } from "./contracts";
import { DATABASE_ENTITY_REGISTRY } from "./contracts";

/** Returns a Prisma `where` fragment excluding soft-deleted rows. */
export function notDeletedWhere(entityId: DatabaseEntityId) {
  const contract = DATABASE_ENTITY_REGISTRY[entityId];
  if (contract.softDeleteField === "deletedAt") {
    return { deletedAt: null };
  }
  if (contract.softDeleteField === "archivedAt") {
    return { archivedAt: null };
  }
  if (contract.softDeleteField === "revokedAt") {
    return { revokedAt: null };
  }
  return {};
}

/** Merge soft-delete filter into an existing where clause. */
export function withNotDeleted<T extends Record<string, unknown>>(entityId: DatabaseEntityId, where: T) {
  return { ...where, ...notDeletedWhere(entityId) };
}

/** Build soft-delete update payload (timestamp now). */
export function softDeleteData(now = new Date()) {
  return { deletedAt: now };
}

/** Build restore payload clearing soft delete. */
export function restoreSoftDeleteData() {
  return { deletedAt: null };
}

/** Returns true when a record appears soft-deleted per entity contract. */
export function isSoftDeleted(entityId: DatabaseEntityId, record: Record<string, unknown>) {
  const contract = DATABASE_ENTITY_REGISTRY[entityId];
  if (contract.softDeleteField === "deletedAt") return record.deletedAt != null;
  if (contract.softDeleteField === "archivedAt") return record.archivedAt != null;
  if (contract.softDeleteField === "revokedAt") return record.revokedAt != null;
  return false;
}
