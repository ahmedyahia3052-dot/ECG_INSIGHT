import assert from "node:assert/strict";

import {
  assertDatabaseFoundationRegistry,
  assertRepositoryQuery,
  DATABASE_ENTITY_REGISTRY,
  entitiesWithSoftDelete,
  notDeletedWhere,
  softDeleteRequiredEntities,
  validateRepositoryQuery,
  withNotDeleted,
} from "../server/src/database/foundation";

assertDatabaseFoundationRegistry();

assert.equal(Object.keys(DATABASE_ENTITY_REGISTRY).length, 12);

const softDeleteEntities = entitiesWithSoftDelete();
assert.ok(softDeleteEntities.includes("patient"));
assert.ok(softDeleteEntities.includes("ecgCase"));
assert.ok(softDeleteEntities.includes("notification"));

assert.deepEqual(notDeletedWhere("patient"), { deletedAt: null });
assert.deepEqual(withNotDeleted("ecgCase", { patientId: "p1" }), { patientId: "p1", deletedAt: null });

const validQuery = validateRepositoryQuery("patient", { deletedAt: null, organizationId: "org1" });
assert.equal(validQuery.valid, true);

const missingFilter = validateRepositoryQuery("ecgCase", { patientId: "p1" });
assert.ok(missingFilter.warnings.length > 0);

assert.doesNotThrow(() => assertRepositoryQuery("organization", { deletedAt: null }));

assert.ok(softDeleteRequiredEntities().length >= 6);

console.log("sprint80-database-foundation.test.ts: all checks passed");
