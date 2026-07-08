/**
 * Sprint 80 — Repository query validation against database foundation contracts.
 */

import { DATABASE_ENTITY_REGISTRY, type DatabaseEntityId } from "./contracts";
import { notDeletedWhere } from "./soft-delete";

export type RepositoryQueryValidation = {
  entityId: DatabaseEntityId;
  errors: string[];
  valid: boolean;
  warnings: string[];
};

/**
 * Validates that a Prisma `where` clause includes soft-delete filtering when required.
 * Repositories serving user-facing reads should pass `includeSoftDeleted: false`.
 */
export function validateRepositoryQuery(
  entityId: DatabaseEntityId,
  where: Record<string, unknown> | undefined,
  options: { includeSoftDeleted?: boolean; requireOrganizationScope?: boolean; organizationId?: string } = {},
): RepositoryQueryValidation {
  const contract = DATABASE_ENTITY_REGISTRY[entityId];
  const errors: string[] = [];
  const warnings: string[] = [];
  const clause = where ?? {};

  if (contract.softDeleteField === "deletedAt" && !options.includeSoftDeleted) {
    const expected = notDeletedWhere(entityId);
    if ("deletedAt" in expected && !("deletedAt" in clause)) {
      warnings.push(`${contract.model}: where clause missing deletedAt filter — use notDeletedWhere('${entityId}')`);
    }
  }

  if (options.requireOrganizationScope && !options.organizationId && !("organizationId" in clause)) {
    errors.push(`${contract.model}: organization-scoped query missing organizationId`);
  }

  return { entityId, errors, valid: errors.length === 0, warnings };
}

/** Assert repository query is valid; throws on hard errors. */
export function assertRepositoryQuery(entityId: DatabaseEntityId, where: Record<string, unknown> | undefined, options?: Parameters<typeof validateRepositoryQuery>[2]) {
  const result = validateRepositoryQuery(entityId, where, options);
  if (!result.valid) {
    throw new Error(`Repository validation failed for ${entityId}: ${result.errors.join("; ")}`);
  }
  return result;
}

/** List entities that require soft-delete filtering in default read paths. */
export function softDeleteRequiredEntities(): DatabaseEntityId[] {
  return (Object.entries(DATABASE_ENTITY_REGISTRY) as Array<[DatabaseEntityId, (typeof DATABASE_ENTITY_REGISTRY)[DatabaseEntityId]]>)
    .filter(([, c]) => c.softDeleteField === "deletedAt")
    .map(([id]) => id);
}
