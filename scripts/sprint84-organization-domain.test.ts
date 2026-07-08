import assert from "node:assert/strict";

import { paginatedResult, resolveOrderBy, apiSuccess } from "../server/src/modules/organization-domain/list-query";
import { orgDomainListSchema } from "../server/src/modules/organization-domain/schemas";
import { ORGANIZATION_DOMAIN_VERSION } from "../server/src/modules/organization-domain/swagger";
import { notDeletedWhere, validateRepositoryQuery } from "../server/src/database/foundation";

const parsed = orgDomainListSchema.parse({ page: "2", pageSize: "10", sortDir: "asc", q: "cardio" });
assert.equal(parsed.page, 2);
assert.equal(parsed.pageSize, 10);
assert.equal(parsed.q, "cardio");

const page = paginatedResult([{ id: "1" }], 1, 1, 25);
assert.equal(page.totalPages, 1);
assert.equal(page.items.length, 1);

const order = resolveOrderBy("name", "asc", { name: { name: "asc" } }, { createdAt: "desc" });
assert.deepEqual(order, { name: "asc" });

const response = apiSuccess(page);
assert.equal(response.success, true);

assert.deepEqual(notDeletedWhere("patient"), { deletedAt: null });

const validation = validateRepositoryQuery("ecgCase", { deletedAt: null, patientId: "p1" });
assert.equal(validation.valid, true);

assert.equal(ORGANIZATION_DOMAIN_VERSION, "sprint84-v1");

console.log("sprint84-organization-domain.test.ts: all checks passed");
